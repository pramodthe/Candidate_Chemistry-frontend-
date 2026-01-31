# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Candidate Chemistry is a swipe-based policy matching application for San Francisco's 2026 Housing Crisis election. Users anonymously vote on policy positions (supports/opposes/skip) via a Tinder-style card interface, then see match percentages with real candidates.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run preview          # Preview production build locally
```

## Environment

Requires `GEMINI_API_KEY` set in `.env.local` for AI-generated policy cards and candidate portraits.

## Architecture

**Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS (CDN), Google GenAI SDK

**State Management**: React `useState`/`useEffect` in `App.tsx`. Three states: `intro` | `playing` | `results`.

**Component Structure**:
- `App.tsx` - Main orchestrator, manages game state and voting progress
- `components/Card.tsx` - Swipeable policy card with 3D physics (CSS transforms, pointer events)
- `components/Results.tsx` - Match results with tilt effects and voice capability
- `components/AIAssistant.tsx` - Voice/text AI guide with chat modal

**Service Layer**:
- `services/geminiService.ts` - Generates policy stance cards and candidate portraits via Gemini API with fallback data
- `services/liveApiService.ts` - Real-time audio streaming for voice interactions (Web Audio API)

**TypeScript Interfaces** (`types.ts`):
- `StanceCard` - Policy question with candidate alignments
- `CandidateMatch` - Individual candidate position on a stance
- `MatchResult` - Aggregated match scores

## Key Patterns

- Uses ESM import maps in `index.html` (no bundler for runtime dependencies)
- Path alias `@/` maps to project root (configured in `tsconfig.json` and `vite.config.ts`)
- Audio processing: PCM float-to-16bit conversion for Gemini API
- AI responses use JSON schema enforcement for structured outputs
