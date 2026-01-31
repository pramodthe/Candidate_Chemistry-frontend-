"""SF Political Intelligence API Package.

This package provides FastAPI endpoints and WebSocket support for
researching San Francisco political candidates.
"""

from api.main import app
from api.models import (
    CandidateInfo,
    CompareRequest,
    HealthCheck,
    ResearchRequest,
    ResearchResponse,
    MAYORAL_CANDIDATES,
)
from api.research_service import research_task_manager
from api.websocket_manager import websocket_manager

__all__ = [
    "app",
    "CandidateInfo",
    "CompareRequest",
    "HealthCheck",
    "ResearchRequest",
    "ResearchResponse",
    "MAYORAL_CANDIDATES",
    "research_task_manager",
    "websocket_manager",
]
