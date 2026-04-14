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

## Key Features Built

### World Map Dashboard (`/conflict-map`)
- **D3.js SVG map** with Natural Earth projection rendering all world countries from TopoJSON
- **Physical terrain background** — `public/world-terrain.png` overlaid as a luminosity texture
- **Color-coded risk levels** — every country colored green → red based on hardcoded risk 1–10
- **Doomsday Clock widget** — Canvas-drawn analog clock in top-right corner; seconds-to-midnight updates when a country is clicked based on its risk profile; animated transition between values
- **Alert level overlay** — radial red gradient tint scales with the clock's danger level
- **Country Intelligence Panel** — click any country for a full sidebar with: overview (capital, population, leader, stability bar, current situation, allies/rivals), historical timeline, and active conflicts
- **Stats bar** — live global metrics (monitored nations, extreme/high risk counts, active conflicts, stable nations) that update to per-country stats when selected
- **Terrain toggle** — show/hide the physical world map background image
- **Zero external API calls** — all data hardcoded in `src/lib/countryDatabase.ts`

### Country Database (`src/lib/countryDatabase.ts`)
43 nations with: name, capital, population, region, riskLevel (1–10), stabilityScore, leader, summary, currentSituation, historical timeline, conflicts (status: active/frozen/resolved), allies, rivals

### Doomsday Clock (`src/components/DoomsdayClock.tsx`)
Canvas-drawn analog clock face with animated hand movement, glow effects, alert color system, and progress bar

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
