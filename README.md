<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Candidate Chemistry

A swipe-based policy matching application for San Francisco's 2026 Housing Crisis election. Discover your political alignment with candidates through anonymous policy voting.

## Setup

### Prerequisites

- Node.js (v18+)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

You can get a free API key from [Google AI Studio](https://aistudio.google.com/).

## Development

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Google GenAI SDK
