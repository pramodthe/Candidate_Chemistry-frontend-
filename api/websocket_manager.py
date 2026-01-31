"""WebSocket connection manager for real-time research updates.

This module handles WebSocket connections and broadcasts research progress
to connected clients in real-time.
"""

import json
import logging
from typing import Dict, List, Optional

from fastapi import WebSocket

# Set up logging
logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for research updates."""

    def __init__(self):
        """Initialize the connection manager."""
        # Map research_id to list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Map research_id to latest progress data
        self.progress_cache: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, research_id: str):
        """Accept a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            research_id: The research task ID
        """
        await websocket.accept()

        if research_id not in self.active_connections:
            self.active_connections[research_id] = []

        self.active_connections[research_id].append(websocket)
        logger.info(f"WebSocket connected for research {research_id}")

        # Send any cached progress immediately
        if research_id in self.progress_cache:
            try:
                await websocket.send_json(self.progress_cache[research_id])
            except Exception as e:
                logger.error(f"Error sending cached progress: {e}")

    def disconnect(self, websocket: WebSocket, research_id: str):
        """Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection to remove
            research_id: The research task ID
        """
        if research_id in self.active_connections:
            if websocket in self.active_connections[research_id]:
                self.active_connections[research_id].remove(websocket)
                logger.info(f"WebSocket disconnected from research {research_id}")

            # Clean up if no more connections
            if not self.active_connections[research_id]:
                del self.active_connections[research_id]
                # Keep progress cache for a while in case of reconnect

    async def broadcast_to_research(self, research_id: str, message: dict):
        """Broadcast a message to all connections for a research task.

        Args:
            research_id: The research task ID
            message: The message to broadcast
        """
        # Cache the message
        self.progress_cache[research_id] = message

        if research_id not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[research_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, research_id)

    async def send_progress(
        self,
        research_id: str,
        percent_complete: int,
        current_task: str,
        sources_found: int,
        estimated_remaining_seconds: int,
    ):
        """Send a progress update.

        Args:
            research_id: The research task ID
            percent_complete: Progress percentage (0-100)
            current_task: Description of current task
            sources_found: Number of sources found so far
            estimated_remaining_seconds: Estimated time remaining
        """
        message = {
            "type": "progress",
            "research_id": research_id,
            "percent_complete": percent_complete,
            "current_task": current_task,
            "sources_found": sources_found,
            "estimated_remaining_seconds": estimated_remaining_seconds,
            "timestamp": self._get_timestamp(),
        }
        await self.broadcast_to_research(research_id, message)

    async def send_source_discovered(
        self, research_id: str, title: str, url: str, relevance_score: float
    ):
        """Notify that a new source was discovered.

        Args:
            research_id: The research task ID
            title: Source title
            url: Source URL
            relevance_score: Relevance score (0-1)
        """
        message = {
            "type": "source",
            "title": title,
            "url": url,
            "relevance_score": relevance_score,
            "timestamp": self._get_timestamp(),
        }
        await self.broadcast_to_research(research_id, message)

    async def send_complete(
        self,
        research_id: str,
        results_url: str,
        summary: dict,
    ):
        """Send completion notification.

        Args:
            research_id: The research task ID
            results_url: URL to retrieve full results
            summary: Summary statistics
        """
        message = {
            "type": "complete",
            "research_id": research_id,
            "results_url": results_url,
            "summary": summary,
            "timestamp": self._get_timestamp(),
        }
        await self.broadcast_to_research(research_id, message)

        # Keep connection open briefly, then clean up
        # Note: We don't disconnect here - client should close connection

    async def send_error(
        self, research_id: str, message: str, recoverable: bool = False
    ):
        """Send an error notification.

        Args:
            research_id: The research task ID
            message: Error message
            recoverable: Whether the error is recoverable
        """
        error_message = {
            "type": "error",
            "message": message,
            "recoverable": recoverable,
            "timestamp": self._get_timestamp(),
        }
        await self.broadcast_to_research(research_id, error_message)

    def _get_timestamp(self) -> str:
        """Get current ISO timestamp."""
        from datetime import datetime

        return datetime.utcnow().isoformat()

    def get_connection_count(self, research_id: str) -> int:
        """Get number of active connections for a research task."""
        return len(self.active_connections.get(research_id, []))

    def get_total_connections(self) -> int:
        """Get total number of active WebSocket connections."""
        return sum(len(conns) for conns in self.active_connections.values())


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
