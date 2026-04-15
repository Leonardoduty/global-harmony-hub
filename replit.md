# Global Governance AI Simulator

A full-stack AI geopolitical simulation platform — "Global Pulse: Harmony Monitor" — with a unified API engine, debug mode, AI decision-making, and news verification.

## Architecture

### Frontend (React 19 + TanStack Start)
- **Port**: 5000 (Vite dev server with SSR)
- **Framework**: TanStack Router (file-based routing in `src/routes/`)
- **Styling**: Tailwind CSS 4 + Framer Motion + Lucide React
- **UI**: Radix UI primitives (Shadcn/UI pattern)

### Backend (Express API Engine)
- **Port**: 3001
- **Entry**: `server/index.js`
- **Unified Endpoint**: `POST /api/engine` — all AI features go through this single endpoint
- **Debug Endpoint**: `GET /api/debug/logs` — full request/response history
- **Health Endpoint**: `GET /api/health` — API status + OpenAI config check

### API Proxy
- Vite proxies `/api/*` → `http://localhost:3001`
- Frontend always calls relative `/api/engine` URLs

## Unified Engine API

All features use `POST /api/engine` with a `type` field:

| type | Description |
|------|-------------|
| `chat` | AI chatbot with advisor personas |
| `decision` | Presidential simulation (generate_scenario, finalize_decision, get_advisor_suggestion) |
| `verify_news` | News fact-checking against world state |
| `generate_headlines` | AI-generated global news feed |
| `world_state` | Get/patch/reset in-memory world state |
| `country_info` | Geopolitical country briefings |

## Debug Mode

A floating **DEBUG** panel in the bottom-left of the app (or press **Ctrl+Shift+D**) shows:
- All API request/response payloads
- Latency timing per request
- AI model used (or "fallback" if no API key)
- Error details
- World state changes

Auto-refresh every 3 seconds when enabled.

## Server Files

```
server/
  index.js      — Express app, CORS, routes
  engine.js     — All handler functions by type
  worldState.js — In-memory world state singleton
  openai.js     — OpenAI client wrapper
  debug.js      — Debug log ring buffer (last 200 entries)
```

## Frontend API Client

`src/lib/apiEngine.ts` — Typed wrappers for every engine request type.

All components use this instead of TanStack server functions.

## Running

```bash
npm run dev     # Runs both Vite (port 5000) and Express (port 3001)
npm run dev:vite   # Vite only
npm run dev:api    # Express only
```

## Environment Variables

- `OPENAI_API_KEY` — Required for AI features. Without it, all requests return structured fallback data (never crashes).
- `API_PORT` — Express port (default: 3001)

## Key Notes

- Removed Lovable-specific `@lovable.dev/vite-tanstack-config` — replaced with standard Vite + TanStack Start config
- Google Fonts loaded client-side via useEffect in `__root.tsx`
- Node 22 required (TanStack Start peer dependency)
- All AI calls use `gpt-4o-mini` by default
- System never crashes — always returns structured JSON with fallback data
