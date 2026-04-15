# Global Pulse — Harmony Monitor

A geopolitical monitoring and simulation platform with AI-driven analysis and interactive "Presidential Simulation" gameplay.

## Tech Stack

- **Framework**: React 19 + TanStack Start (full-stack, SSR-capable)
- **Routing**: TanStack Router (file-based, `src/routes/`)
- **Styling**: Tailwind CSS 4 + Framer Motion + Lucide React
- **UI**: Radix UI primitives (Shadcn/UI pattern)
- **Maps**: D3.js + TopoJSON (SVG world map)
- **Charts**: Recharts
- **AI**: Google Gemini API + OpenAI (via `src/lib/`)
- **Build**: Vite 7, TypeScript, Node 22

## Project Structure

- `src/routes/` — Pages: index, conflict-map, presidential-sim, news-shield, situation-room
- `src/components/` — UI components (`ui/`, `sim/`), WorldMap, DoomsdayClock, Header, HarmonyChatbot
- `src/functions/` — TanStack Start server functions (chatbot, country, presidential, news-verify, world-state)
- `src/lib/` — Core utilities: gemini.ts, openai.ts, countryDatabase.ts, proceduralCrisis.ts, worldState.ts
- `src/context/` — SimulationContext (global game state)
- `public/geo/` — TopoJSON files for world map

## Running the App

```bash
npm run dev
```

Runs on port 5000.

## Key Notes

- Removed Lovable-specific `@lovable.dev/vite-tanstack-config` and replaced with standard Vite + TanStack Start config
- Google Fonts loaded client-side via useEffect in `__root.tsx` (avoids PostCSS `@import` ordering issues)
- Node 22 required (TanStack Start peer dependency)
- AI features use `GEMINI_API_KEY` and `OPENAI_API_KEY` environment variables
