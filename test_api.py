"""Test script for the FastAPI application.

This script tests the API endpoints without requiring external API keys.
"""

import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# Set dummy API keys to prevent import errors
os.environ["FIREWORKS_API_KEY"] = "dummy_key_for_testing"
os.environ["TAVILY_API_KEY"] = "dummy_key_for_testing"


def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")

    try:
        from api.models import MAYORAL_CANDIDATES, CandidateInfo

        print(f"✅ Models loaded: {len(MAYORAL_CANDIDATES)} candidates")

        from api.websocket_manager import websocket_manager

        print("✅ WebSocket manager loaded")

        from api.research_service import research_task_manager

        print("✅ Research service loaded")

        print("\n✅ All imports successful!")
        return True

    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_models():
    """Test Pydantic models."""
    print("\nTesting models...")

    from api.models import (
        CandidateInfo,
        ResearchRequest,
        ResearchResponse,
        ResearchDepth,
        MAYORAL_CANDIDATES,
    )

    # Test candidate data
    candidate = MAYORAL_CANDIDATES[0]
    print(f"✅ Candidate: {candidate.name} - {candidate.current_role}")

    # Test request model
    request = ResearchRequest(
        issues=["housing", "public_safety"],
        depth=ResearchDepth.STANDARD,
        include_voting_records=True,
    )
    print(f"✅ ResearchRequest created: {request.model_dump_json()}")

    print("\n✅ All model tests passed!")
    return True


def test_fastapi_app():
    """Test FastAPI application initialization."""
    print("\nTesting FastAPI app...")

    try:
        from fastapi.testclient import TestClient
        from api.main import app

        client = TestClient(app)

        # Test root endpoint
        response = client.get("/")
        assert response.status_code == 200
        print(f"✅ Root endpoint: {response.json()}")

        # Test health check
        response = client.get("/health")
        assert response.status_code == 200
        health = response.json()
        print(f"✅ Health check: {health['status']}")

        # Test list candidates
        response = client.get("/api/v1/candidates")
        assert response.status_code == 200
        candidates = response.json()
        print(f"✅ List candidates: {len(candidates)} candidates")

        # Test get single candidate
        response = client.get("/api/v1/candidates/London%20Breed")
        assert response.status_code == 200
        candidate = response.json()
        print(f"✅ Get candidate: {candidate['name']}")

        print("\n✅ All FastAPI tests passed!")
        return True

    except Exception as e:
        print(f"❌ FastAPI test error: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_websocket_manager():
    """Test WebSocket manager."""
    print("\nTesting WebSocket manager...")

    from api.websocket_manager import websocket_manager

    # Test connection count
    count = websocket_manager.get_total_connections()
    print(f"✅ Initial connection count: {count}")

    print("\n✅ WebSocket manager tests passed!")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("SF Political Intelligence API - Test Suite")
    print("=" * 60)

    all_passed = True

    all_passed &= test_imports()
    all_passed &= test_models()
    all_passed &= test_fastapi_app()
    all_passed &= test_websocket_manager()

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)
    print("=" * 60)
