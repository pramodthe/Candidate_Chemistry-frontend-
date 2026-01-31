# Match Before Ballot - SF Political Intelligence Platform

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-00a393.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Make informed voting decisions with AI-powered candidate research**

Match Before Ballot is a comprehensive political intelligence platform that uses AI agents to research San Francisco mayoral candidates, analyze their positions on key issues, and present the findings in an easy-to-understand format. Built with modern AI/ML tools and a robust FastAPI backend with real-time updates.

## 🎯 What is This?

**Match Before Ballot** helps voters understand where candidates stand on the issues that matter most. Instead of spending hours reading campaign websites and news articles, our AI agents:

- Research candidates across 5 key policy areas
- Analyze voting records and public statements
- Generate binary "supports/opposes" stance cards
- Provide ELI5 (explain like I'm 5) summaries
- Deliver results in real-time via WebSocket

## 🏛️ Target Election

**San Francisco Mayoral Election 2025-2026**

### Candidates Tracked

| Candidate | Current Role | Party | Key Issues |
|-----------|--------------|-------|------------|
| **London Breed** | Incumbent Mayor | Moderate Democrat | Housing, Public Safety, Economy |
| **Daniel Lurie** | Business Leader | Moderate Democrat | Homelessness, Public Safety, Economy |
| **Aaron Peskin** | Supervisor President | Progressive Democrat | Housing, Transportation, Great Highway |
| **Mark Farrell** | Former Supervisor | Moderate Democrat | Public Safety, Housing, Economy |
| **Ahsha Safaí** | District 11 Supervisor | Moderate Democrat | Housing, Labor, Homelessness |

### Policy Domains

- 🏘️ **Housing** - Upzoning, Rent Control, Permitting
- 🚔 **Public Safety** - Police staffing, Surveillance, Drug policies
- 🏠 **Homelessness** - Encampment sweeps, Shelter-first vs Housing-first
- 🚗 **Transportation** - Great Highway, Slow Streets, Parking
- 💰 **Economy** - Business taxes, Downtown recovery

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- API keys for Tavily and Fireworks AI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/match_before_ballot.git
   cd match_before_ballot
   ```

2. **Install dependencies**
   ```bash
   # Using uv (recommended)
   uv sync

   # Or using pip
   pip install -e "."
   ```

3. **Set up environment variables**
   ```bash
   cp example.env .env
   # Edit .env and add your API keys:
   # TAVILY_API_KEY=your_tavily_api_key
   # FIREWORKS_API_KEY=your_fireworks_api_key
   ```

### Running the Application

#### Option 1: FastAPI Backend (Recommended)

```bash
# Start the API server
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Access the interactive documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### Option 2: Streamlit Interface

```bash
# Run the Streamlit web app
uv run streamlit run app.py
```

Access at: http://localhost:8501

#### Option 3: Command Line

```bash
# Run the command-line agent
uv run python agent_app.py
```

## 📡 API Usage

### 1. List All Candidates

```bash
curl http://localhost:8000/api/v1/candidates
```

### 2. Start Candidate Research

```bash
curl -X POST "http://localhost:8000/api/v1/research/candidate/London%20Breed" \
  -H "Content-Type: application/json" \
  -d '{
    "issues": ["housing", "public_safety"],
    "depth": "standard",
    "include_voting_records": true,
    "max_sources": 10
  }'
```

Response:
```json
{
  "research_id": "550e8400-e29b-41d4-a716-446655440000",
  "candidate_name": "London Breed",
  "status": "processing",
  "websocket_url": "/ws/research/550e8400-e29b-41d4-a716-446655440000",
  "estimated_time_seconds": 120,
  "message": "Research started for London Breed. Connect to WebSocket for updates."
}
```

### 3. Connect to WebSocket for Real-time Updates

**JavaScript:**
```javascript
const researchId = "550e8400-e29b-41d4-a716-446655440000";
const ws = new WebSocket(`ws://localhost:8000/ws/research/${researchId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'progress':
      console.log(`Progress: ${message.percent_complete}%`);
      console.log(`Current task: ${message.current_task}`);
      break;
    case 'source':
      console.log(`New source found: ${message.title}`);
      break;
    case 'complete':
      console.log('Research complete!');
      fetchResults(message.results_url);
      ws.close();
      break;
    case 'error':
      console.error(`Error: ${message.message}`);
      break;
  }
};
```

**Python:**
```python
import websocket
import json

def on_message(ws, message):
    msg = json.loads(message)
    if msg['type'] == 'progress':
        print(f"Progress: {msg['percent_complete']}% - {msg['current_task']}")
    elif msg['type'] == 'complete':
        print(f"✅ Complete! Results at: {msg['results_url']}")
        ws.close()

ws = websocket.WebSocketApp(
    "ws://localhost:8000/ws/research/550e8400-e29b-41d4-a716-446655440000",
    on_message=on_message
)
ws.run_forever()
```

### 4. Check Research Status

```bash
curl http://localhost:8000/api/v1/research/status/550e8400-e29b-41d4-a716-446655440000
```

### 5. Compare Multiple Candidates

```bash
curl -X POST "http://localhost:8000/api/v1/research/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "candidates": ["London Breed", "Daniel Lurie", "Aaron Peskin"],
    "issue": "housing",
    "generate_stance_cards": true
  }'
```

### 6. Get Research Results

```bash
curl http://localhost:8000/api/v1/research/results/550e8400-e29b-41d4-a716-446655440000
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATION                      │
│  (Web Browser / Mobile App / CLI)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   REST API   │  │  WebSocket   │  │   Models     │     │
│  │   Routes     │  │   Manager    │  │  (Pydantic)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 RESEARCH SERVICE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Search     │  │   Analysis   │  │   Storage    │     │
│  │  (Tavily)    │  │   (AI/ML)    │  │  (JSON)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | FastAPI | REST API & WebSocket endpoints |
| **AI Model** | Fireworks AI (MiniMax-M2P1) | Content summarization & analysis |
| **Search Engine** | Tavily | Real-time web search for candidate info |
| **Data Storage** | JSON Files | Research results persistence |
| **Real-time Updates** | WebSocket | Live progress notifications |
| **Task Management** | Python asyncio | Concurrent research tasks |

## 📁 Project Structure

```
match_before_ballot/
├── api/                          # FastAPI Application
│   ├── __init__.py              # Package exports
│   ├── main.py                  # FastAPI routes & WebSocket
│   ├── models.py                # Pydantic schemas
│   ├── research_service.py      # Research orchestration
│   ├── websocket_manager.py     # WebSocket connections
│   └── README.md                # API-specific docs
│
├── src/deep_agents_from_scratch/ # Core AI Agent Framework
│   ├── __init__.py
│   ├── file_tools.py            # Virtual file system
│   ├── models.py                # AI model configuration
│   ├── prompts.py               # System prompts
│   ├── research_tools.py        # Tavily search integration
│   ├── state.py                 # Agent state management
│   ├── task_tool.py             # Sub-agent delegation
│   └── todo_tools.py            # Task planning tools
│
├── research_results/            # Research output (gitignored)
├── results/                     # Legacy results (gitignored)
├── app.py                       # Streamlit web interface
├── agent_app.py                 # Command-line agent
├── test_api.py                  # API test suite
├── example.env                  # Environment template
├── pyproject.toml               # Project configuration
├── uv.lock                      # Dependency lock
└── README.md                    # This file
```

## 🎨 Output Format

### Stance Card Structure

Research results are returned as structured JSON with stance cards:

```json
{
  "stance_id": "housing-01",
  "question": "Should San Francisco prioritize building more housing in all neighborhoods?",
  "context": "A contentious debate between YIMBYs (Yes In My Backyard) and NIMBYs (Not In My Backyard)",
  "analysis": "Think of it like a pizza shop. Some people want more pizza places so everyone can get a slice (YIMBYs). Others worry new pizza shops will change their neighborhood's character (NIMBYs).",
  "candidate_matches": [
    {
      "name": "London Breed",
      "alignment": "supports",
      "source_link": "https://sfchronicle.com/...",
      "party": "Moderate Democrat",
      "bio": "Incumbent mayor who has pushed for housing development",
      "gender": "female"
    },
    {
      "name": "Aaron Peskin",
      "alignment": "opposes",
      "source_link": "https://sfexaminer.com/...",
      "party": "Progressive Democrat",
      "bio": "Supervisor who prioritizes neighborhood preservation",
      "gender": "male"
    }
  ]
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Required for web search
TAVILY_API_KEY=tvly-your-key-here

# Required for AI model
FIREWORKS_API_KEY=fw-your-key-here

# Optional: For LangSmith tracing
LANGSMITH_API_KEY=ls-your-key-here
LANGSMITH_TRACING=false
LANGSMITH_PROJECT=match-before-ballot
```

### Research Depth Levels

- **Quick** (30 sec): 1-2 searches, basic positions
- **Standard** (2 min): 3-5 searches, voting records included
- **Deep** (5 min): Full analysis with historical context

### Rate Limits

- **5 concurrent** research tasks maximum
- **5 search queries** per research task
- **15-minute timeout** per task
- **3 candidates minimum** per stance card (ensures balance)

## 🧪 Testing

### Run API Tests

```bash
# Test all components
python test_api.py

# Expected output:
# ✅ Models loaded: 5 candidates
# ✅ WebSocket manager loaded
# ✅ Research service loaded
# ✅ All FastAPI tests passed!
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# List candidates
curl http://localhost:8000/api/v1/candidates | jq

# Get specific candidate
curl http://localhost:8000/api/v1/candidates/London%20Breed | jq
```

## 🚀 Deployment

### Docker (Recommended for Production)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .
RUN pip install -e "."

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t match-before-ballot .
docker run -p 8000:8000 --env-file .env match-before-ballot
```

### Using Gunicorn

```bash
gunicorn api.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 \
  --timeout 120
```

### Cloud Deployment

**Railway:**
```bash
railway init
railway up
```

**Heroku:**
```bash
heroku create match-before-ballot
heroku config:set TAVILY_API_KEY=xxx FIREWORKS_API_KEY=xxx
git push heroku main
```

## 🛠️ Development

### Adding a New Candidate

Edit `api/models.py` and add to `MAYORAL_CANDIDATES`:

```python
CandidateInfo(
    name="New Candidate",
    current_role="Position",
    party_affiliation="Party",
    gender="male/female",
    bio_summary="Brief bio",
    key_issues=["issue1", "issue2"]
)
```

### Adding a New Issue Domain

1. Update `ResearchRequest` model validation
2. Add search query templates in `research_service.py`
3. Update the `issues` list in API requests

### Customizing Research Behavior

Edit `api/research_service.py`:

```python
# Adjust search query building
def _build_search_queries(self, ...):
    queries = []
    # Add custom queries here
    return queries

# Customize stance card generation
def _generate_stance_cards(self, ...):
    # Modify logic for determining supports/opposes
    pass
```

## 🔒 Security Considerations

- ✅ API keys stored in `.env` (gitignored)
- ✅ CORS configured for production
- ✅ No sensitive data in research results
- ✅ Rate limiting prevents abuse
- ✅ Input validation on all endpoints

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run linting
ruff check .

# Run type checking
mypy api/
```

## 📚 Documentation

- **API Documentation**: See `api/README.md`
- **Architecture Details**: See inline code comments
- **Usage Examples**: See `test_api.py`

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain** - AI agent framework
- **FastAPI** - Web framework
- **Tavily** - Search API
- **Fireworks AI** - Model hosting
- **San Francisco Elections** - Public data

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR-USERNAME/match_before_ballot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR-USERNAME/match_before_ballot/discussions)
- **Email**: your-email@example.com

## 🗺️ Roadmap

- [ ] Frontend React app
- [ ] Database persistence (PostgreSQL)
- [ ] Caching layer (Redis)
- [ ] User authentication
- [ ] Historical election data
- [ ] Multi-city support
- [ ] Mobile app

---

**Made with ❤️ for informed democracy**

*Remember: Your vote matters. Research before you choose.*
