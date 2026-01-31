"""Pydantic models for the SF Political Intelligence API.

This module defines all the data models used for API requests and responses,
including research configurations, progress tracking, and results.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ResearchDepth(str, Enum):
    """Research depth levels."""

    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"


class ResearchStatus(str, Enum):
    """Research task status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CandidateInfo(BaseModel):
    """Basic information about a political candidate."""

    name: str = Field(..., description="Full name of the candidate")
    current_role: str = Field(..., description="Current political position")
    party_affiliation: str = Field(..., description="Political party")
    gender: str = Field(..., description="Gender for voice synthesis")
    bio_summary: str = Field(..., description="Brief biography")
    key_issues: List[str] = Field(default=[], description="Key policy areas")


class CandidateMatch(BaseModel):
    """Candidate position on a specific issue."""

    name: str = Field(..., description="Full name")
    alignment: str = Field(..., pattern="^(supports|opposes)$")
    source_link: str = Field(..., description="URL to proof")
    party: str = Field(..., description="Political affiliation")
    bio: str = Field(..., description="Bio relevant to this issue")
    gender: str = Field(..., description="Gender")


class StanceCard(BaseModel):
    """A stance card representing a political issue."""

    stance_id: str = Field(..., description="Unique ID (e.g., housing-01)")
    question: str = Field(..., description="The controversial policy question")
    context: str = Field(..., description="1-sentence objective context")
    analysis: str = Field(..., description="ELI5 explanation (2-3 sentences)")
    candidate_matches: List[CandidateMatch] = Field(
        ..., description="Candidates and their positions"
    )


class Source(BaseModel):
    """A research source/document."""

    title: str
    url: str
    source_type: str = Field(default="news", description="news, gov, campaign, etc.")
    date_published: Optional[str] = None
    summary: str = Field(default="", description="Brief summary of content")
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)


class ResearchRequest(BaseModel):
    """Request body for initiating candidate research."""

    issues: List[str] = Field(
        default=["housing", "public_safety", "great_highway"],
        description="Issues to research",
    )
    depth: ResearchDepth = Field(
        default=ResearchDepth.STANDARD, description="Research depth level"
    )
    include_voting_records: bool = Field(
        default=True, description="Include voting record searches"
    )
    max_sources: int = Field(default=10, ge=1, le=20)


class CompareRequest(BaseModel):
    """Request body for comparing multiple candidates."""

    candidates: List[str] = Field(
        ..., min_length=2, max_length=5, description="Candidates to compare"
    )
    issue: Optional[str] = Field(
        default=None, description="Specific issue to compare (optional)"
    )
    generate_stance_cards: bool = Field(
        default=True, description="Generate stance cards from comparison"
    )


class ResearchResponse(BaseModel):
    """Initial response when research is initiated."""

    research_id: str
    candidate_name: Optional[str] = None
    comparison_id: Optional[str] = None
    status: ResearchStatus
    websocket_url: str
    estimated_time_seconds: int
    message: str


class ResearchProgress(BaseModel):
    """Research progress update."""

    research_id: str
    candidate_name: str
    status: ResearchStatus
    percent_complete: int = Field(ge=0, le=100)
    current_task: str
    sources_found: int
    started_at: datetime
    estimated_completion: Optional[datetime] = None
    elapsed_seconds: int = 0


class ProgressUpdate(BaseModel):
    """WebSocket progress message."""

    type: str = "progress"
    research_id: str
    percent_complete: int
    current_task: str
    sources_found: int
    estimated_remaining_seconds: int


class SourceDiscovered(BaseModel):
    """WebSocket source discovery message."""

    type: str = "source"
    title: str
    url: str
    relevance_score: float


class ResearchComplete(BaseModel):
    """WebSocket completion message."""

    type: str = "complete"
    research_id: str
    results_url: str
    summary: Dict[str, Any]


class ResearchError(BaseModel):
    """WebSocket error message."""

    type: str = "error"
    message: str
    recoverable: bool = False


class ResearchResults(BaseModel):
    """Complete research results."""

    research_id: str
    candidate_name: str
    completed_at: datetime
    total_sources: int
    issues_researched: List[str]
    stances: List[StanceCard]
    raw_sources: List[Source]
    summary: str
    metadata: Dict[str, Any] = Field(default={})


class ComparisonResults(BaseModel):
    """Results from comparing multiple candidates."""

    comparison_id: str
    candidates: List[str]
    issue: Optional[str]
    completed_at: datetime
    stance_cards: List[StanceCard]
    candidate_profiles: List[Dict[str, Any]]
    summary: str


class HealthCheck(BaseModel):
    """API health check response."""

    status: str
    version: str
    timestamp: datetime
    active_research_tasks: int
    total_research_completed: int


# Predefined candidate data
MAYORAL_CANDIDATES = [
    CandidateInfo(
        name="London Breed",
        current_role="Mayor of San Francisco (Incumbent)",
        party_affiliation="Moderate Democrat",
        gender="female",
        bio_summary="Incumbent mayor since 2018, former supervisor",
        key_issues=["housing", "public_safety", "economy"],
    ),
    CandidateInfo(
        name="Daniel Lurie",
        current_role="Business Leader",
        party_affiliation="Moderate Democrat",
        gender="male",
        bio_summary="Levi Strauss heir and former nonprofit executive",
        key_issues=["homelessness", "public_safety", "economy"],
    ),
    CandidateInfo(
        name="Aaron Peskin",
        current_role="SF Board of Supervisors President",
        party_affiliation="Progressive Democrat",
        gender="male",
        bio_summary="Progressive supervisor, former board president",
        key_issues=["housing", "transportation", "great_highway"],
    ),
    CandidateInfo(
        name="Mark Farrell",
        current_role="Former SF Supervisor",
        party_affiliation="Moderate Democrat",
        gender="male",
        bio_summary="Former supervisor and interim mayor in 2018",
        key_issues=["public_safety", "housing", "economy"],
    ),
    CandidateInfo(
        name="Ahsha Safaí",
        current_role="SF Board of Supervisors",
        party_affiliation="Moderate Democrat",
        gender="male",
        bio_summary="Supervisor from District 11, labor organizer background",
        key_issues=["housing", "labor", "homelessness"],
    ),
]
