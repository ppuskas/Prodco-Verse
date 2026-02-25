# ONBOARDING: Prodco-Verse

## 🎯 Objective
The **Prodco-Verse** is a competitive intelligence tool mapping the landscape of boutique AI production agencies. It visualizes the relationships between agencies, their founders, alumni pedigree (traditional agencies), and notable projects as an interactive D3 force-directed graph.

## 🏗️ Architecture
- **Frontend**: Custom **D3.js** constellation graph. Supports tooltip overlays with bios, project links, and social handles.
- **Backend**: **Node.js/Express**. Primary data store: `server/data/industry_graph.json`.
- **Research Flow**: Agentic — the user pins nodes for research on the local graph, and the agent (Gemini/Claude) processes pins in-session using the browser subagent to crawl sources and inject data via the `/api/mapper/inject` endpoint.
- **Deploy**: **Vercel** (read-only). All mutation happens locally during agent sessions. `git push` to deploy.

## 🚀 Getting Started
1. `npm install`
2. `npm start`
3. Navigate to `http://127.0.0.1:3002`

## 📊 Data Schema (`industry_graph.json`)
- **Landmark**: Major agencies (Native Foreign, EDGLRD, Mother LA). Solid Orange glow.
- **Agency**: Discovered/Competitor agencies. Solid Green or Hollow (if unmapped).
- **Person**: Founders or key talent. Solid Pink. May have `bio`, `linkedIn`, `twitter`.
- **Project**: Commercial works / films / ads. Solid Blue. May have `url`, `isNotable`, `isViral`.
- **Traditional**: Legacy pedigree companies (W+K, TBWA, Apple). Purple.

## 🛠️ Key Files
- `server/data/industry_graph.json` — The source of truth.
- `server/data/research_queue.json` — Pending research pins from the user.
- `server/services/companyMapper.js` — `injectData`, queue helpers, graph I/O.
- `server/routes/mapper.js` — API routes (`/graph`, `/inject`, `/pin`, `/queue`).
- `public/index.html` — D3 graph, research panel, tooltip, filters.

## 🔄 Agentic Workflow
1. User clicks a node locally → 📌 **Pin for Research** (with optional notes)
2. A queue entry is saved to `research_queue.json`
3. Agent reads the queue at session start → crawls LinkedIn / Vimeo / X / articles
4. Agent injects results via `POST /api/mapper/inject`
5. User reviews the updated graph → pins more targets → cycle continues
6. `git push` → Vercel auto-deploys the read-only version

## ⚠️ Notes
- The `research_queue.json` is `.gitignore`'d — it's local-only.
- Vercel deploy blocks all write endpoints (`/inject`, `/pin`) with a 403 guard.
- Projects filter is hidden by default to reduce visual noise — auto-enables on scrape.
