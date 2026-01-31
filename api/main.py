"""SF Political Intelligence API - Main FastAPI Application.

This module sets up the FastAPI application with all routes, middleware,
and WebSocket endpoints for the political research API.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.models import (
    CandidateInfo,
    CompareRequest,
    ComparisonResults,
    HealthCheck,
    MAYORAL_CANDIDATES,
    ResearchDepth,
    ResearchProgress,
    ResearchRequest,
    ResearchResponse,
    ResearchResults,
    ResearchStatus,
)
from api.research_service import research_task_manager
from api.websocket_manager import websocket_manager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting SF Political Intelligence API")
    yield
    # Shutdown
    logger.info("Shutting down API")


# Create FastAPI app
app = FastAPI(
    title="SF Political Intelligence API",
    description="""
    API for researching San Francisco political candidates and generating structured policy data.
    
    ## Features
    
    * **Candidate Research**: Deep research on individual candidates with real-time WebSocket updates
    * **Candidate Comparison**: Compare multiple candidates on specific issues
    * **Real-time Updates**: WebSocket connections for live research progress
    * **Stance Cards**: Generate structured stance cards with binary positions
    
    ## Candidates Available
    
    * London Breed (Incumbent Mayor)
    * Daniel Lurie (Business Leader)
    * Aaron Peskin (Supervisor President)
    * Mark Farrell (Former Supervisor)
    * Ahsha Safaí (Supervisor)
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "SF Political Intelligence API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        active_research_tasks=research_task_manager.get_active_count(),
        total_research_completed=research_task_manager.get_completed_count(),
    )


@app.get("/api/v1/candidates", response_model=list[CandidateInfo])
async def list_candidates():
    """List all available political candidates.

    Returns:
        List of candidate information including name, role, party, and bio.
    """
    return MAYORAL_CANDIDATES


@app.get("/api/v1/candidates/{candidate_name}")
async def get_candidate(candidate_name: str):
    """Get detailed information about a specific candidate.

    Args:
        candidate_name: Name of the candidate (case-insensitive)

    Returns:
        Candidate information or 404 if not found.
    """
    for candidate in MAYORAL_CANDIDATES:
        if candidate.name.lower() == candidate_name.lower():
            return candidate

    raise HTTPException(
        status_code=404,
        detail=f"Candidate '{candidate_name}' not found. Available candidates: "
        f"{[c.name for c in MAYORAL_CANDIDATES]}",
    )


@app.post(
    "/api/v1/research/candidate/{candidate_name}", response_model=ResearchResponse
)
async def research_candidate(
    candidate_name: str,
    request: ResearchRequest,
):
    """Start deep research on a specific candidate.

    This endpoint initiates a background research task and returns immediately
    with a research_id. Connect to the WebSocket endpoint to receive real-time
    progress updates.

    Args:
        candidate_name: Name of the candidate to research
        request: Research configuration including issues, depth, and options

    Returns:
        ResearchResponse with research_id and WebSocket URL for updates.

    Example:
        ```python
        response = requests.post(
            "/api/v1/research/candidate/London%20Breed",
            json={"issues": ["housing", "public_safety"], "depth": "standard"}
        )
        research_id = response.json()["research_id"]

        # Connect to WebSocket for updates
        ws = websocket.connect(f"ws://localhost:8000/ws/research/{research_id}")
        ```
    """
    # Validate candidate exists
    candidate = None
    for c in MAYORAL_CANDIDATES:
        if c.name.lower() == candidate_name.lower():
            candidate = c
            break

    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate '{candidate_name}' not found",
        )

    # Start research
    try:
        research_id = await research_task_manager.start_candidate_research(
            candidate_name=candidate.name,
            issues=request.issues,
            depth=request.depth,
            include_voting_records=request.include_voting_records,
            max_sources=request.max_sources,
        )

        # Estimate time based on depth
        estimated_seconds = {
            ResearchDepth.QUICK: 30,
            ResearchDepth.STANDARD: 120,
            ResearchDepth.DEEP: 300,
        }.get(request.depth, 120)

        return ResearchResponse(
            research_id=research_id,
            candidate_name=candidate.name,
            status=ResearchStatus.PROCESSING,
            websocket_url=f"/ws/research/{research_id}",
            estimated_time_seconds=estimated_seconds,
            message=f"Research started for {candidate.name}. Connect to WebSocket for updates.",
        )

    except Exception as e:
        logger.error(f"Error starting research: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start research: {str(e)}",
        )


@app.post("/api/v1/research/compare", response_model=ResearchResponse)
async def compare_candidates(request: CompareRequest):
    """Start a comparison research task between multiple candidates.

    This endpoint compares positions of multiple candidates on a specific issue
    or their general stances. Returns immediately with a research_id.

    Args:
        request: Comparison configuration with candidates and options

    Returns:
        ResearchResponse with comparison_id and WebSocket URL.

    Example:
        ```python
        response = requests.post(
            "/api/v1/research/compare",
            json={
                "candidates": ["London Breed", "Daniel Lurie"],
                "issue": "housing",
                "generate_stance_cards": true
            }
        )
        ```
    """
    # Validate all candidates
    for name in request.candidates:
        found = any(c.name.lower() == name.lower() for c in MAYORAL_CANDIDATES)
        if not found:
            raise HTTPException(
                status_code=404,
                detail=f"Candidate '{name}' not found",
            )

    try:
        research_id = await research_task_manager.start_comparison_research(
            candidates=request.candidates,
            issue=request.issue,
            generate_stance_cards=request.generate_stance_cards,
        )

        return ResearchResponse(
            research_id=research_id,
            comparison_id=research_id,
            status=ResearchStatus.PROCESSING,
            websocket_url=f"/ws/research/{research_id}",
            estimated_time_seconds=len(request.candidates) * 60,
            message=f"Comparison started for {len(request.candidates)} candidates. "
            f"Connect to WebSocket for updates.",
        )

    except Exception as e:
        logger.error(f"Error starting comparison: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start comparison: {str(e)}",
        )


@app.get("/api/v1/research/status/{research_id}", response_model=ResearchProgress)
async def get_research_status(research_id: str):
    """Get the current status of a research task.

    Args:
        research_id: The research task ID

    Returns:
        Current progress including percent complete, current task, and status.
    """
    task = research_task_manager.get_task_status(research_id)

    if not task:
        # Check if completed
        results = research_task_manager.get_results(research_id)
        if results:
            return ResearchProgress(
                research_id=research_id,
                candidate_name=results.get("candidate_name", ""),
                status=ResearchStatus.COMPLETED,
                percent_complete=100,
                current_task="Research complete",
                sources_found=results.get("total_sources", 0),
                started_at=datetime.fromisoformat(results.get("completed_at", "")),
                elapsed_seconds=0,
            )
        raise HTTPException(
            status_code=404,
            detail=f"Research task '{research_id}' not found",
        )

    return ResearchProgress(
        research_id=research_id,
        candidate_name=task.get("candidate_name", ""),
        status=ResearchStatus(task.get("status", "pending")),
        percent_complete=task.get("percent_complete", 0),
        current_task=task.get("current_task", ""),
        sources_found=task.get("sources_found", 0),
        started_at=task.get("started_at"),
        elapsed_seconds=int(
            (datetime.utcnow() - task.get("started_at")).total_seconds()
        ),
    )


@app.get("/api/v1/research/results/{research_id}")
async def get_research_results(research_id: str):
    """Get completed research results.

    Args:
        research_id: The research task ID

    Returns:
        Research results including stance cards, sources, and summary.

    Raises:
        404: If research not found or not completed
        202: If research is still in progress
    """
    # First check if still processing
    task = research_task_manager.get_task_status(research_id)
    if task and task.get("status") == "processing":
        raise HTTPException(
            status_code=202,
            detail=f"Research in progress ({task.get('percent_complete', 0)}% complete)",
        )

    # Get results
    results = research_task_manager.get_results(research_id)
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"Research results for '{research_id}' not found",
        )

    return results


@app.websocket("/ws/research/{research_id}")
async def research_websocket(websocket: WebSocket, research_id: str):
    """WebSocket endpoint for real-time research updates.

    Connect to this endpoint to receive live progress updates, source discoveries,
    and completion notifications for a research task.

    Args:
        websocket: WebSocket connection
        research_id: The research task ID to monitor

    Message Types:
        - **progress**: Progress updates with percent complete
        - **source**: New source discovered during research
        - **complete**: Research completed with results URL
        - **error**: Error occurred during research
    """
    await websocket_manager.connect(websocket, research_id)

    try:
        while True:
            # Keep connection alive, listen for any client messages
            data = await websocket.receive_text()

            # Handle client messages (e.g., ping, cancel)
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            elif data == "cancel":
                # Cancel research (if we implement cancellation)
                await websocket.send_json(
                    {
                        "type": "cancelled",
                        "research_id": research_id,
                    }
                )
                break

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, research_id)
        logger.info(f"WebSocket disconnected for research {research_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {research_id}: {e}")
        websocket_manager.disconnect(websocket, research_id)


@app.get("/api/v1/research/active")
async def list_active_research():
    """List all currently active research tasks.

    Returns:
        List of active research tasks with their current status.
    """
    active_tasks = []
    for research_id, task in research_task_manager.active_tasks.items():
        active_tasks.append(
            {
                "research_id": research_id,
                "type": task.get("type"),
                "candidate_name": task.get("candidate_name"),
                "candidates": task.get("candidates"),
                "percent_complete": task.get("percent_complete"),
                "current_task": task.get("current_task"),
                "started_at": task.get("started_at").isoformat()
                if task.get("started_at")
                else None,
            }
        )

    return {
        "count": len(active_tasks),
        "tasks": active_tasks,
    }


@app.delete("/api/v1/research/{research_id}")
async def cancel_research(research_id: str):
    """Cancel an active research task.

    Args:
        research_id: The research task ID to cancel

    Returns:
        Confirmation of cancellation
    """
    task = research_task_manager.get_task_status(research_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"Research task '{research_id}' not found",
        )

    if task.get("status") != "processing":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel research with status: {task.get('status')}",
        )

    # Mark as cancelled
    task["status"] = "cancelled"
    del research_task_manager.active_tasks[research_id]

    await websocket_manager.send_error(
        research_id=research_id,
        message="Research cancelled by user",
        recoverable=False,
    )

    return {"message": f"Research {research_id} cancelled successfully"}


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
