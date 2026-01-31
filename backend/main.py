from fastapi import FastAPI, HTTPException, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
import asyncio
import json
from datetime import datetime

app = FastAPI(title="Candidate Chemistry Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
research_sessions: Dict[str, dict] = {}
research_results: Dict[str, dict] = {}
candidates_db = [
    {"name": "Aaron Peskin", "party": "Progressive", "bio": "President of the Board of Supervisors", "gender": "male"},
    {"name": "London Breed", "party": "Moderate", "bio": "Current Mayor", "gender": "female"},
    {"name": "Daniel Lurie", "party": "Moderate", "bio": "Non-profit founder", "gender": "male"},
    {"name": "Scott Wiener", "party": "Democrat", "bio": "State Senator", "gender": "male"},
    {"name": "Ahsha Safaí", "party": "Moderate", "bio": "Supervisor", "gender": "male"},
    {"name": "Connie Chan", "party": "Progressive", "bio": "Supervisor", "gender": "female"},
    {"name": "Dean Preston", "party": "Democratic Socialist", "bio": "Supervisor", "gender": "male"},
    {"name": "Mark Farrell", "party": "Moderate", "bio": "Former Interim Mayor", "gender": "male"},
    {"name": "Joel Engardio", "party": "Moderate", "bio": "Supervisor", "gender": "male"},
    {"name": "Myrna Melgar", "party": "Progressive", "bio": "Supervisor", "gender": "female"},
    {"name": "Matt Dorsey", "party": "Moderate", "bio": "Supervisor", "gender": "male"},
    {"name": "Hillary Ronen", "party": "Progressive", "bio": "Supervisor", "gender": "female"},
]

# WebSocket connections per research ID
ws_connections: Dict[str, WebSocket] = {}

@app.get("/api/v1/candidates")
def list_candidates():
    return {"candidates": candidates_db}

@app.get("/api/v1/candidates/{name}")
def get_candidate(name: str):
    candidate = next((c for c in candidates_db if c["name"].lower() == name.lower()), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@app.post("/api/v1/research/candidate/{name}")
async def start_candidate_research(name: str, background_tasks: BackgroundTasks):
    session_id = f"research_{uuid.uuid4().hex[:12]}"
    research_sessions[session_id] = {
        "id": session_id,
        "candidate_name": name,
        "status": "in_progress",
        "created_at": datetime.now().isoformat(),
        "progress": 0
    }

    background_tasks.add_task(perform_research, session_id, name)

    return {
        "id": session_id,
        "candidate_name": name,
        "status": "in_progress",
        "created_at": research_sessions[session_id]["created_at"],
        "progress": 0
    }

async def perform_research(session_id: str, candidate_name: str):
    """Perform research on a candidate (simulated)"""
    for progress in [25, 50, 75, 100]:
        await asyncio.sleep(1)  # Simulate work
        if session_id in research_sessions:
            research_sessions[session_id]["progress"] = progress

            # Notify WebSocket clients
            if session_id in ws_connections:
                try:
                    ws = ws_connections[session_id]
                    await ws.send_json({
                        "id": session_id,
                        "status": "in_progress",
                        "progress": progress
                    })
                except Exception as e:
                    print(f"WebSocket send error: {e}")

    # Create result
    research_results[session_id] = {
        "id": session_id,
        "candidate_name": candidate_name,
        "summary": f"Research summary for {candidate_name}. Progressive candidate focused on housing and public safety.",
        "stances": [
            {
                "stance_id": f"{candidate_name.lower().replace(' ', '_')}_1",
                "question": "Should rent control be expanded?",
                "context": "Current state law limits rent control to older buildings.",
                "analysis": f"{candidate_name}'s position on rent control expansion.",
                "alignment": "supports",
                "candidate_matches": [{
                    "name": candidate_name,
                    "alignment": "supports",
                    "source_link": "https://example.com/vote",
                    "party": "Researched",
                    "gender": "male"
                }]
            },
            {
                "stance_id": f"{candidate_name.lower().replace(' ', '_')}_2",
                "question": "Should the city upzone single-family neighborhoods?",
                "context": "San Francisco's west side is largely low-density.",
                "analysis": f"{candidate_name}'s position on upzoning.",
                "alignment": "opposes",
                "candidate_matches": [{
                    "name": candidate_name,
                    "alignment": "opposes",
                    "source_link": "https://example.com/vote2",
                    "party": "Researched",
                    "gender": "male"
                }]
            }
        ]
    }

    if session_id in research_sessions:
        research_sessions[session_id]["status"] = "completed"

    # Notify completion
    if session_id in ws_connections:
        try:
            ws = ws_connections[session_id]
            await ws.send_json({
                "id": session_id,
                "status": "completed",
                "progress": 100
            })
        except:
            pass

@app.post("/api/v1/research/compare")
async def compare_candidates(body: dict):
    names = body.get("names", [])
    results = []
    for name in names:
        # Start research for each candidate
        session_id = f"research_{name.lower().replace(' ', '_')}"
        if session_id not in research_results:
            research_results[session_id] = {
                "id": session_id,
                "candidate_name": name,
                "summary": f"Comparison data for {name}.",
                "stances": []
            }
        results.append(research_results[session_id])

    return {
        "candidates": names,
        "common_stances": [],
        "differences": [],
        "results": results
    }

@app.get("/api/v1/research/status/{id}")
def get_research_status(id: str):
    session = research_sessions.get(id)
    if not session:
        raise HTTPException(status_code=404, detail="Research session not found")
    return session

@app.get("/api/v1/research/results/{id}")
def get_research_results(id: str):
    result = research_results.get(id)
    if not result:
        raise HTTPException(status_code=404, detail="Research results not found")
    return result

@app.get("/api/v1/research/active")
def get_active_research():
    active = [s for s in research_sessions.values() if s["status"] in ["pending", "in_progress"]]
    return {"active": active}

@app.delete("/api/v1/research/{id}")
def cancel_research(id: str):
    if id in research_sessions:
        research_sessions[id]["status"] = "cancelled"
        return {"message": "Research cancelled"}
    raise HTTPException(status_code=404, detail="Research session not found")

@app.websocket("/ws/research/{id}")
async def websocket_research(websocket: WebSocket, id: str):
    await websocket.accept()
    ws_connections[id] = websocket
    print(f"WebSocket connected for research {id}")
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive
            if data == "ping":
                await websocket.send_text("pong")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if id in ws_connections:
            del ws_connections[id]
        print(f"WebSocket disconnected for research {id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
