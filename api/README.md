"""API documentation and examples.

# SF Political Intelligence API

## Quick Start

### 1. Start the API Server

```bash
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Test the API

#### List Candidates
```bash
curl http://localhost:8000/api/v1/candidates
```

#### Start Candidate Research
```bash
curl -X POST "http://localhost:8000/api/v1/research/candidate/London%20Breed" \
  -H "Content-Type: application/json" \
  -d '{
    "issues": ["housing", "public_safety"],
    "depth": "standard",
    "include_voting_records": true
  }'
```

Response:
```json
{
  "research_id": "uuid-string",
  "candidate_name": "London Breed",
  "status": "processing",
  "websocket_url": "/ws/research/uuid-string",
  "estimated_time_seconds": 120,
  "message": "Research started for London Breed. Connect to WebSocket for updates."
}
```

#### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/research/uuid-string');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message);
};
```

#### Compare Candidates
```bash
curl -X POST "http://localhost:8000/api/v1/research/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": ["London Breed", "Daniel Lurie"],
    "issue": "housing",
    "generate_stance_cards": true
  }'
```

#### Check Research Status
```bash
curl http://localhost:8000/api/v1/research/status/uuid-string
```

#### Get Research Results
```bash
curl http://localhost:8000/api/v1/research/results/uuid-string
```

## WebSocket Message Types

### Progress Update
```json
{
  "type": "progress",
  "research_id": "uuid",
  "percent_complete": 45,
  "current_task": "Searching for voting records...",
  "sources_found": 3,
  "estimated_remaining_seconds": 60
}
```

### Source Discovered
```json
{
  "type": "source",
  "title": "SF Chronicle Article",
  "url": "https://sfchronicle.com/...",
  "relevance_score": 0.92
}
```

### Research Complete
```json
{
  "type": "complete",
  "research_id": "uuid",
  "results_url": "/api/v1/research/results/uuid",
  "summary": {
    "total_sources": 12,
    "stances_identified": 8,
    "issues_covered": 3
  }
}
```

### Error
```json
{
  "type": "error",
  "message": "Rate limit exceeded",
  "recoverable": true
}
```

## Response Models

### StanceCard
```typescript
interface StanceCard {
  stance_id: string;
  question: string;
  context: string;
  analysis: string;
  candidate_matches: CandidateMatch[];
}

interface CandidateMatch {
  name: string;
  alignment: 'supports' | 'opposes';
  source_link: string;
  party: string;
  bio: string;
  gender: 'male' | 'female';
}
```

## Rate Limits

- Maximum 5 concurrent research tasks
- Maximum 5 search queries per research task
- 15-minute timeout per research task

## Environment Variables

Required in `.env`:
```
TAVILY_API_KEY=your_tavily_api_key
FIREWORKS_API_KEY=your_fireworks_api_key
```

## Architecture

```
Client → FastAPI Routes → Research Service → Tavily Search
              ↓
         WebSocket Manager (Real-time updates)
              ↓
         JSON File Storage (research_results/)
```

## Testing

### Using curl
```bash
# Health check
curl http://localhost:8000/health

# List candidates
curl http://localhost:8000/api/v1/candidates | jq

# Start research
curl -X POST "http://localhost:8000/api/v1/research/candidate/London%20Breed" \
  -H "Content-Type: application/json" \
  -d '{"issues": ["housing"], "depth": "quick"}'
```

### Using Python
```python
import requests
import websocket
import json

# Start research
response = requests.post(
    "http://localhost:8000/api/v1/research/candidate/London%20Breed",
    json={"issues": ["housing"], "depth": "quick"}
)
data = response.json()
research_id = data["research_id"]

# Connect to WebSocket
def on_message(ws, message):
    msg = json.loads(message)
    if msg["type"] == "progress":
        print(f"Progress: {msg['percent_complete']}%")
    elif msg["type"] == "complete":
        print("Research complete!")
        ws.close()

ws = websocket.WebSocketApp(
    f"ws://localhost:8000/ws/research/{research_id}",
    on_message=on_message
)
ws.run_forever()
```

## Production Deployment

### Using Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .
RUN pip install -e "."

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Gunicorn
```bash
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Frontend Integration Example

### React Component
```jsx
import React, { useState, useEffect } from 'react';

function ResearchComponent() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  const startResearch = async (candidateName) => {
    const response = await fetch(
      `/api/v1/research/candidate/${candidateName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues: ['housing'], depth: 'quick' })
      }
    );
    const data = await response.json();
    
    // Connect WebSocket
    const ws = new WebSocket(`ws://localhost:8000${data.websocket_url}`);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'progress') {
        setProgress(msg.percent_complete);
        setStatus(msg.current_task);
      } else if (msg.type === 'complete') {
        fetchResults(msg.results_url);
      }
    };
  };
  
  return (
    <div>
      <button onClick={() => startResearch('London Breed')}>
        Research London Breed
      </button>
      <progress value={progress} max="100" />
      <p>{status}</p>
    </div>
  );
}
```

## Support

For issues or questions:
1. Check the API docs at `/docs`
2. Review the example requests above
3. Check server logs for errors

## License

MIT License - See LICENSE file for details.
"""
