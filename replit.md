# Global Governance AI Simulator

A full-stack AI geopolitical simulation platform — "Global Pulse: Harmony Monitor" — with a unified API engine, dual-AI provider system, full debug visibility, AI decision-making, and news verification.

## Architecture

### Frontend (React 19 + Vite SPA)
- **Port**: 5000 (Vite dev server, plain SPA — no SSR)
- **Routing**: Simple path-based SPA router via `src/lib/router.ts` (`usePath` + `navigate`)
- **Pages**: `src/routes/` — each file exports a default page component
- **Shell**: `src/App.tsx` — renders the active page inside the Layout
- **Layout**: `src/routes/__root.tsx` — Header + page slot + Chatbot + DebugPanel
- **Entry**: `src/main.tsx` → mounts `<App />` into `#root` in `index.html`
- **Styling**: Tailwind CSS 4 + Framer Motion + Lucide React
- **UI**: Radix UI primitives (Shadcn/UI pattern)

### Backend (Express API Engine)
- **Port**: 3001
- **Entry**: `server/index.js`
- **Unified Endpoint**: `POST /api/engine` — all AI features go through this single endpoint
- **Debug Endpoint**: `GET /api/debug/logs` — full request/response history
- **Health Endpoint**: `GET /api/health` — API status + provider config check

### API Proxy
- Vite proxies `/api/*` → `http://localhost:3001`
- Frontend always calls relative `/api/engine` URLs

## Dual-AI Provider System

Every AI call uses `callAI()` in `server/openai.js` with automatic fallback:

1. **Primary**: OpenRouter — model `nvidia/nemotron-3-nano-30b-a3b:free`
   - Uses `OPENROUTER_API_KEY` env var, or `OPENAI_API_KEY` if it starts with `sk-or-`
2. **Fallback**: OpenAI — model `gpt-4o-mini`
   - Uses `OPENAI_API_KEY` (non `sk-or-` key) or `OPENAI_BACKUP_KEY`
3. **If both fail**: Returns structured JSON failure — never crashes silently

Every response includes a full `ai_flow` trace:
```json
{
  "debug": {
    "ai_provider_used": "openrouter | openai | none",
    "openrouter_status": "success | failed | skipped",
    "openai_status": "success | failed | skipped",
    "ai_flow": {
      "openrouter_attempted": true,
      "openrouter_success": true,
      "openrouter_error": null,
      "openai_attempted": false,
      "openai_success": false,
      "openai_error": null
    },
    "world_state_before": {},
    "world_state_after": {}
  }
}
```

## Unified Engine API

All features use `POST /api/engine` with a `type` field:

| type | Description |
|------|-------------|
| `chat` | AI chatbot with advisor personas (Diplomatic, Economic, Military) |
| `decision` | Presidential simulation (generate_scenario, finalize_decision, get_advisor_suggestion) |
| `verify_news` | News fact-checking against world state |
| `generate_headlines` | AI-generated global news feed |
| `world_state` | Get/patch/reset in-memory world state |
| `country_info` | Geopolitical country briefings |
| `debug` | System diagnostics — AI provider health, engine hits, latency stats |

## Debug Panel

A floating **DEBUG** button in the bottom-left of the app (or press **Ctrl+Shift+D**) shows:
- All API request/response payloads
- Latency timing per request
- Which AI provider was used (OpenRouter / OpenAI) with flow indicator
- Fallback trigger warnings (⚡ icon)
- Error details
- World state changes
- Auto-refresh every 3 seconds when enabled

## Server Files

```
server/
  index.js      — Express app, CORS, routes, full debug block on every response
  engine.js     — All handler functions by type, ai_flow threaded through all
  worldState.js — In-memory world state singleton
  openai.js     — Dual-AI callAI() function + provider status checker
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

- `OPENAI_API_KEY` — Used for OpenRouter if starts with `sk-or-`, or OpenAI directly
- `OPENROUTER_API_KEY` — Dedicated OpenRouter key (optional, takes priority)
- `OPENAI_BACKUP_KEY` — Dedicated OpenAI fallback key (optional)
- `API_PORT` — Express port (default: 3001)

## Key Notes

- Node 22 required (TanStack Start peer dependency)
- All AI calls try OpenRouter first (free model), fallback to OpenAI
- System never crashes — always returns structured JSON
- No silent failures — every error is logged and visible in debug output
