"""Research service for orchestrating candidate research tasks.

This module handles the actual research logic, integrating with the existing
tools to perform searches, process results, and generate stance cards.
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from api.models import (
    CandidateInfo,
    CandidateMatch,
    MAYORAL_CANDIDATES,
    ResearchDepth,
    ResearchResults,
    Source,
    StanceCard,
)
from api.websocket_manager import websocket_manager

# Import existing research tools
from deep_agents_from_scratch.research_tools import run_tavily_search

logger = logging.getLogger(__name__)


class ResearchTaskManager:
    """Manages active research tasks and their state."""

    def __init__(self):
        """Initialize the research task manager."""
        self.active_tasks: Dict[str, dict] = {}
        self.completed_research: Dict[str, dict] = {}
        self.research_results_dir = "research_results"

        # Ensure results directory exists
        os.makedirs(self.research_results_dir, exist_ok=True)

    async def start_candidate_research(
        self,
        candidate_name: str,
        issues: List[str],
        depth: ResearchDepth,
        include_voting_records: bool,
        max_sources: int,
    ) -> str:
        """Start a new candidate research task.

        Args:
            candidate_name: Name of the candidate to research
            issues: List of issues to research
            depth: Research depth level
            include_voting_records: Whether to search voting records
            max_sources: Maximum number of sources to collect

        Returns:
            research_id: Unique identifier for this research task
        """
        research_id = str(uuid.uuid4())

        # Validate candidate
        candidate = self._get_candidate_info(candidate_name)
        if not candidate:
            raise ValueError(f"Unknown candidate: {candidate_name}")

        # Initialize task state
        self.active_tasks[research_id] = {
            "id": research_id,
            "type": "candidate",
            "candidate_name": candidate_name,
            "issues": issues,
            "depth": depth,
            "status": "processing",
            "percent_complete": 0,
            "current_task": "Initializing research...",
            "sources_found": 0,
            "sources": [],
            "started_at": datetime.utcnow(),
            "estimated_completion": None,
        }

        # Start research in background
        asyncio.create_task(
            self._execute_candidate_research(
                research_id,
                candidate,
                issues,
                depth,
                include_voting_records,
                max_sources,
            )
        )

        return research_id

    async def start_comparison_research(
        self,
        candidates: List[str],
        issue: Optional[str],
        generate_stance_cards: bool,
    ) -> str:
        """Start a comparison research task.

        Args:
            candidates: List of candidate names to compare
            issue: Specific issue to compare (optional)
            generate_stance_cards: Whether to generate stance cards

        Returns:
            research_id: Unique identifier for this comparison task
        """
        research_id = str(uuid.uuid4())

        # Validate all candidates
        candidate_objects = []
        for name in candidates:
            candidate = self._get_candidate_info(name)
            if not candidate:
                raise ValueError(f"Unknown candidate: {name}")
            candidate_objects.append(candidate)

        # Initialize task state
        self.active_tasks[research_id] = {
            "id": research_id,
            "type": "comparison",
            "candidates": candidates,
            "issue": issue,
            "status": "processing",
            "percent_complete": 0,
            "current_task": "Initializing comparison...",
            "sources_found": 0,
            "sources": [],
            "started_at": datetime.utcnow(),
        }

        # Start comparison in background
        asyncio.create_task(
            self._execute_comparison_research(
                research_id, candidate_objects, issue, generate_stance_cards
            )
        )

        return research_id

    async def _execute_candidate_research(
        self,
        research_id: str,
        candidate: CandidateInfo,
        issues: List[str],
        depth: ResearchDepth,
        include_voting_records: bool,
        max_sources: int,
    ):
        """Execute the candidate research process.

        Args:
            research_id: Research task ID
            candidate: Candidate information
            issues: Issues to research
            depth: Research depth
            include_voting_records: Whether to include voting records
            max_sources: Maximum sources to collect
        """
        try:
            task = self.active_tasks[research_id]
            sources = []
            stances = []

            # Calculate search queries based on depth
            queries = self._build_search_queries(
                candidate.name, issues, depth, include_voting_records
            )

            total_queries = len(queries)
            for idx, query in enumerate(queries):
                # Update progress
                progress = int((idx / total_queries) * 100)
                task["percent_complete"] = progress
                task["current_task"] = f"Searching: {query[:50]}..."

                await websocket_manager.send_progress(
                    research_id=research_id,
                    percent_complete=progress,
                    current_task=task["current_task"],
                    sources_found=len(sources),
                    estimated_remaining_seconds=(total_queries - idx) * 30,
                )

                # Execute search
                try:
                    search_results = await asyncio.to_thread(
                        run_tavily_search,
                        query=query,
                        max_results=2 if depth == ResearchDepth.QUICK else 3,
                        topic="news",
                        include_raw_content=True,
                    )

                    # Process results
                    for result in search_results.get("results", []):
                        source = Source(
                            title=result.get("title", "Untitled"),
                            url=result.get("url", ""),
                            source_type="news",
                            summary=result.get("content", "")[:200],
                            relevance_score=result.get("score", 0.5),
                        )
                        sources.append(source)
                        task["sources_found"] = len(sources)

                        # Notify via WebSocket
                        await websocket_manager.send_source_discovered(
                            research_id=research_id,
                            title=source.title,
                            url=source.url,
                            relevance_score=source.relevance_score,
                        )

                        # Stop if we have enough sources
                        if len(sources) >= max_sources:
                            break

                    # Small delay to prevent rate limiting
                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.error(f"Error during search: {e}")
                    continue

            # Generate stance cards from sources
            task["current_task"] = "Analyzing positions..."
            task["percent_complete"] = 90

            await websocket_manager.send_progress(
                research_id=research_id,
                percent_complete=90,
                current_task="Analyzing positions...",
                sources_found=len(sources),
                estimated_remaining_seconds=10,
            )

            stances = self._generate_stance_cards(candidate.name, issues, sources)

            # Create results
            results = ResearchResults(
                research_id=research_id,
                candidate_name=candidate.name,
                completed_at=datetime.utcnow(),
                total_sources=len(sources),
                issues_researched=issues,
                stances=stances,
                raw_sources=sources,
                summary=f"Researched {candidate.name} on {len(issues)} issues with {len(sources)} sources",
                metadata={
                    "depth": depth.value,
                    "include_voting_records": include_voting_records,
                },
            )

            # Save results
            await self._save_results(research_id, results.model_dump())

            # Mark complete
            task["status"] = "completed"
            task["percent_complete"] = 100
            task["current_task"] = "Research complete"
            self.completed_research[research_id] = task
            del self.active_tasks[research_id]

            # Notify completion
            await websocket_manager.send_complete(
                research_id=research_id,
                results_url=f"/api/v1/research/results/{research_id}",
                summary={
                    "total_sources": len(sources),
                    "stances_identified": len(stances),
                    "issues_covered": len(issues),
                },
            )

        except Exception as e:
            logger.error(f"Error in research task {research_id}: {e}")
            task["status"] = "failed"
            task["current_task"] = f"Error: {str(e)}"
            await websocket_manager.send_error(research_id, str(e), recoverable=False)

    async def _execute_comparison_research(
        self,
        research_id: str,
        candidates: List[CandidateInfo],
        issue: Optional[str],
        generate_stance_cards: bool,
    ):
        """Execute comparison research between candidates.

        Args:
            research_id: Research task ID
            candidates: List of candidate objects
            issue: Specific issue to compare
            generate_stance_cards: Whether to generate stance cards
        """
        try:
            task = self.active_tasks[research_id]
            all_sources = []
            candidate_profiles = []

            # Research each candidate
            for idx, candidate in enumerate(candidates):
                progress = int((idx / len(candidates)) * 100)
                task["percent_complete"] = progress
                task["current_task"] = f"Researching {candidate.name}..."

                await websocket_manager.send_progress(
                    research_id=research_id,
                    percent_complete=progress,
                    current_task=task["current_task"],
                    sources_found=len(all_sources),
                    estimated_remaining_seconds=(len(candidates) - idx) * 60,
                )

                # Search for candidate
                search_query = f"{candidate.name} San Francisco 2025 2026 position {'on ' + issue if issue else ''}"

                try:
                    search_results = await asyncio.to_thread(
                        run_tavily_search,
                        query=search_query,
                        max_results=2,
                        topic="news",
                        include_raw_content=True,
                    )

                    candidate_sources = []
                    for result in search_results.get("results", []):
                        source = Source(
                            title=result.get("title", "Untitled"),
                            url=result.get("url", ""),
                            source_type="news",
                            summary=result.get("content", "")[:200],
                            relevance_score=result.get("score", 0.5),
                        )
                        candidate_sources.append(source)
                        all_sources.append(source)

                        await websocket_manager.send_source_discovered(
                            research_id=research_id,
                            title=source.title,
                            url=source.url,
                            relevance_score=source.relevance_score,
                        )

                    candidate_profiles.append(
                        {
                            "name": candidate.name,
                            "sources": [s.model_dump() for s in candidate_sources],
                            "bio": candidate.bio_summary,
                            "party": candidate.party_affiliation,
                        }
                    )

                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.error(f"Error researching {candidate.name}: {e}")
                    continue

            # Generate comparison results
            task["percent_complete"] = 95
            task["current_task"] = "Generating comparison..."

            stance_cards = []
            if generate_stance_cards and issue:
                # Create a simple stance card for the issue
                matches = []
                for profile in candidate_profiles:
                    # Infer alignment from sources (simplified)
                    alignment = "supports"  # Default
                    for source in profile.get("sources", []):
                        content = source.get("summary", "").lower()
                        if any(
                            word in content for word in ["oppose", "against", "reject"]
                        ):
                            alignment = "opposes"
                            break

                    matches.append(
                        CandidateMatch(
                            name=profile["name"],
                            alignment=alignment,
                            source_link=profile["sources"][0]["url"]
                            if profile["sources"]
                            else "",
                            party=profile["party"],
                            bio=profile["bio"],
                            gender="female"
                            if "female" in profile["bio"].lower()
                            else "male",
                        )
                    )

                stance_cards.append(
                    StanceCard(
                        stance_id=f"compare-{issue.replace(' ', '-')}-01",
                        question=f"Should San Francisco prioritize {issue}?",
                        context=f"A contentious issue in the 2025-2026 election cycle",
                        analysis=f"This issue divides candidates with different visions for San Francisco's future",
                        candidate_matches=matches,
                    )
                )

            # Save results
            results = {
                "comparison_id": research_id,
                "candidates": [c.name for c in candidates],
                "issue": issue,
                "completed_at": datetime.utcnow().isoformat(),
                "stance_cards": [s.model_dump() for s in stance_cards],
                "candidate_profiles": candidate_profiles,
                "summary": f"Compared {len(candidates)} candidates on {issue or 'general positions'}",
            }

            await self._save_results(research_id, results)

            # Mark complete
            task["status"] = "completed"
            task["percent_complete"] = 100
            task["current_task"] = "Comparison complete"
            self.completed_research[research_id] = task
            del self.active_tasks[research_id]

            await websocket_manager.send_complete(
                research_id=research_id,
                results_url=f"/api/v1/research/results/{research_id}",
                summary={
                    "candidates_compared": len(candidates),
                    "total_sources": len(all_sources),
                    "stance_cards_generated": len(stance_cards),
                },
            )

        except Exception as e:
            logger.error(f"Error in comparison task {research_id}: {e}")
            task["status"] = "failed"
            task["current_task"] = f"Error: {str(e)}"
            await websocket_manager.send_error(research_id, str(e), recoverable=False)

    def _build_search_queries(
        self,
        candidate_name: str,
        issues: List[str],
        depth: ResearchDepth,
        include_voting_records: bool,
    ) -> List[str]:
        """Build search queries based on parameters."""
        queries = []

        # Issue-specific queries
        for issue in issues:
            if depth == ResearchDepth.QUICK:
                queries.append(f"{candidate_name} San Francisco {issue} position 2025")
            else:
                queries.append(f"{candidate_name} San Francisco {issue} policy stance")
                queries.append(f"{candidate_name} SF {issue} voting record")

        # General position queries for deeper research
        if depth in [ResearchDepth.STANDARD, ResearchDepth.DEEP]:
            queries.append(f"{candidate_name} San Francisco mayoral campaign 2025 2026")

        if depth == ResearchDepth.DEEP and include_voting_records:
            queries.append(f"{candidate_name} SF Board of Supervisors voting record")

        return queries[:5]  # Limit to 5 queries maximum

    def _generate_stance_cards(
        self, candidate_name: str, issues: List[str], sources: List[Source]
    ) -> List[StanceCard]:
        """Generate stance cards from research sources."""
        stances = []

        for idx, issue in enumerate(issues):
            # Find relevant sources for this issue
            relevant_sources = [
                s
                for s in sources
                if issue.lower() in s.title.lower()
                or issue.lower() in s.summary.lower()
            ]

            if relevant_sources:
                # Determine alignment from source content
                alignment = "supports"
                for source in relevant_sources:
                    content = source.summary.lower()
                    if any(word in content for word in ["oppose", "against", "reject"]):
                        alignment = "opposes"
                        break

                stances.append(
                    StanceCard(
                        stance_id=f"{candidate_name.lower().replace(' ', '-')}-{issue}-0{idx + 1}",
                        question=f"Should San Francisco prioritize {issue}?",
                        context=f"A key issue in the 2025-2026 election",
                        analysis=f"Based on {len(relevant_sources)} sources, {candidate_name} appears to {alignment} this approach",
                        candidate_matches=[
                            CandidateMatch(
                                name=candidate_name,
                                alignment=alignment,
                                source_link=relevant_sources[0].url,
                                party="Moderate Democrat",  # Simplified
                                bio=f"Mayoral candidate with stated position on {issue}",
                                gender="female"
                                if candidate_name == "London Breed"
                                else "male",
                            )
                        ],
                    )
                )

        return stances

    def _get_candidate_info(self, name: str) -> Optional[CandidateInfo]:
        """Get candidate info by name."""
        for candidate in MAYORAL_CANDIDATES:
            if candidate.name.lower() == name.lower():
                return candidate
        return None

    async def _save_results(self, research_id: str, results: dict):
        """Save research results to JSON file."""
        filepath = os.path.join(self.research_results_dir, f"{research_id}.json")
        with open(filepath, "w") as f:
            json.dump(results, f, indent=2, default=str)

    def get_task_status(self, research_id: str) -> Optional[dict]:
        """Get the current status of a research task."""
        if research_id in self.active_tasks:
            return self.active_tasks[research_id]
        if research_id in self.completed_research:
            return self.completed_research[research_id]
        return None

    def get_results(self, research_id: str) -> Optional[dict]:
        """Get completed research results."""
        filepath = os.path.join(self.research_results_dir, f"{research_id}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None

    def get_active_count(self) -> int:
        """Get number of active research tasks."""
        return len(self.active_tasks)

    def get_completed_count(self) -> int:
        """Get number of completed research tasks."""
        return len(self.completed_research)


# Global research task manager instance
research_task_manager = ResearchTaskManager()
