# SF Political Intelligence API

FastAPI-based API for researching San Francisco political candidates with real-time WebSocket updates.

## Quick Start

### 1. Install Dependencies

```bash
uv sync
# or
pip install -e "."
```

### 2. Set Environment Variables

Create a `.env` file with your API keys:
```bash
TAVILY_API_KEY=your_tavily_api_key
FIREWORKS_API_KEY=your_fireworks_api_key
```

### 3. Run the API Server

```bash
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Candidates

- `GET /api/v1/candidates` - List all candidates
- `GET /api/v1/candidates/{name}` - Get specific candidate

### Research

- `POST /api/v1/research/candidate/{name}` - Start candidate research
- `POST /api/v1/research/compare` - Compare multiple candidates
- `GET /api/v1/research/status/{id}` - Check research status
- `GET /api/v1/research/results/{id}` - Get research results
- `GET /api/v1/research/active` - List active research tasks
- `DELETE /api/v1/research/{id}` - Cancel research

### WebSocket

- `WS /ws/research/{id}` - Real-time research updates

## Example Usage

### Start Research
```bash
curl -X POST "http://localhost:8000/api/v1/research/candidate/London%20Breed" \
  -H "Content-Type: application/json" \
  -d '{
    "issues": ["housing", "public_safety"],
    "depth": "standard"
  }'
```

Response:
```json
{
  "research_id": "uuid-string",
  "status": "processing",
  "websocket_url": "/ws/research/uuid-string",
  "estimated_time_seconds": 120
}
```

### WebSocket Connection (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/research/uuid-string');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.type, msg);
};
```

## Features

- ✅ Deep candidate research with Tavily search
- ✅ Real-time WebSocket progress updates
- ✅ Candidate comparison on specific issues
- ✅ Stance card generation (JSON format)
- ✅ Efficient rate limiting (max 5 queries per research)
- ✅ Automatic result storage in `research_results/`
- ✅ CORS enabled for frontend integration

## Available Candidates

1. **London Breed** - Incumbent Mayor
2. **Daniel Lurie** - Business Leader
3. **Aaron Peskin** - Supervisor President
4. **Mark Farrell** - Former Supervisor
5. **Ahsha Safaí** - Supervisor

## Running Tests

```bash
python test_api.py
```

## Production Deployment

```bash
# Using Gunicorn with Uvicorn workers
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

## Project Structure

```
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI routes
│   ├── models.py            # Pydantic schemas
│   ├── research_service.py  # Research orchestration
│   ├── websocket_manager.py # WebSocket connections
│   └── README.md            # API documentation
├── research_results/        # JSON output storage
└── test_api.py              # Test suite
```

## License

MIT License
