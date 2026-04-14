# Global Pulse — Harmony Monitor

A web platform for monitoring global stability, fact-checking news, and simulating diplomatic/presidential decision-making.

## Tech Stack

- **Framework**: React 19 + TypeScript with TanStack Start (full-stack framework built on TanStack Router + Vite)
- **Routing**: TanStack Router (file-based routing in `src/routes/`)
- **Styling**: Tailwind CSS 4.0, Framer Motion, Lucide React
- **UI Components**: Radix UI primitives (Shadcn/UI style in `src/components/ui/`)
- **Visualization**: D3-geo + TopoJSON for maps, Recharts for charts
- **AI**: Google Gemini SDK (`src/lib/gemini.ts`)
- **Forms**: React Hook Form + Zod
- **Build**: Vite 7 via `@lovable.dev/vite-tanstack-config`
- **Package Manager**: npm (also has bun.lockb)

## Project Structure

- `src/routes/` — File-based page routes
- `src/components/` — Reusable UI and feature components
- `src/functions/` — Business logic (chatbot, country data, simulation)
- `src/lib/` — Utilities, Gemini config, mock/procedural data
- `src/hooks/` — Custom React hooks
- `public/geo/` — GeoJSON data for world map

## Running the App

- **Dev**: `npm run dev` (port 5000)
- **Build**: `npm run build`

## Configuration Notes

- `vite.config.ts` is configured to run on port 5000, host `0.0.0.0`, with `allowedHosts: true` for Replit proxy compatibility
- Deployment configured as static site, build output in `dist/client`
- The `@lovable.dev/vite-tanstack-config` package wraps Vite with TanStack Start, Tailwind, etc. — do not add those plugins manually
