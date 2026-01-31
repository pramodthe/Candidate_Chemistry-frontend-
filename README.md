<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Candidate Chemistry

A swipe-based policy matching application for San Francisco's 2026 Housing Crisis election. Discover your political alignment with candidates through anonymous policy voting.

## Setup

### Prerequisites

- Node.js (v18+)
- Python 3.8+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

```bash
npm install
pip install fastapi uvicorn
```

### Environment Variables

Create a `.env.local` file in the project root with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

You can get a free API key from [Google AI Studio](https://aistudio.google.com/).

## Development

Start both the backend and frontend:

**Terminal 1 - Backend:**
```bash
cd backend
python3 main.py
```
API server runs at http://localhost:8000

**Terminal 2 - Frontend:**
```bash
npm run dev
```
App runs at http://localhost:3000

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

## Research Assistant Chatbot

A floating chatbot is available in the bottom-right corner. Commands:

- `list` - List all candidates
- `research <name>` - Start research on a candidate
- `compare <name1>, <name2>` - Compare candidates
- `status <id>` - Check research status
- `active` - Show active research
- `help` - Show all commands

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Tech Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS
- Google GenAI SDK
- FastAPI (Python) backend
