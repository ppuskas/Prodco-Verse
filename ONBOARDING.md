# ONBOARDING: Prodco-Verse Project

## 🎯 Objective
The **Prodco-Verse** is a competitive intelligence tool designed to map the burgeoning landscape of "Boutique AI Production Agencies." Unlike traditional agency maps, this tool focuses on the "Agentic Growth" of firms using Sora, Runway, and LLM-driven pipelines.

## 🏗️ Architecture
- **Frontend**: A custom **D3.js** force-directed graph. It supports "No-Reload" updates, allowing the agent to inject new data into the graph and restart the physics simulation without breaking the user's pan/zoom context.
- **Backend**: **Node.js/Express**. The primary data store is `server/data/industry_graph.json`.
- **Agent Protocol**: The project uses the browser subagent to perform "Active Browser Crawling." This bypasses LinkedIn/X authentication blocks by using the user's existing login session.

## 🚀 Getting Started
1. **Directory**: `C:\Users\ppusk\OneDrive\Documents\_PROJECTS\CompanyMapper`
2. **Launch**:
   ```bash
   npm install  # (Already installed)
   npm start
   ```
3. **Navigate**: `http://127.0.0.1:3002`

## 📊 Data Schema (`industry_graph.json`)
- **Landmark**: Major agencies (Native Foreign, EDGLRD, Mother LA). Solid Orange.
- **Agency**: Discovered/Competitor agencies. Solid Green or Hollow (if unmapped).
- **Person**: Founders or key talent. Solid Red/Pink.
- **Project**: Commercial works/Music videos. Solid Blue.
- **Traditional**: Legacy pedigree companies (e.g., Apple, W+K). Purple.

## 🛠️ Key Files
- `server/data/industry_graph.json`: The source of truth for the constellation.
- `server/services/companyMapper.js`: Contains the "Scraper" logic and Agent Protocol implementations.
- `public/index.html`: Contains the D3 graph, the action panel, and the real-time update logic.

## 🚩 Current Status & Technical Quirks
- **Dummy Data vs. Real Scrapes**: Landmark nodes (Native Foreign, Edglrd, etc.) have hand-scraped "Notable" data. Unknown/Discovered nodes currently use a "Notable Fallback" generator in `companyMapper.js` that pulls high-profile brand work (Nike, Apple).
- **Phasing**: We are moving from "Mock Data" (V1) to "Search Scrapers" (V2) using Cheerio or LLM-based web search.
- **Graph Visibility**: The "Projects" filter is hidden by default to prevent visual noise. The UI automatically toggles it ON when a user successfuly scrapes a node.

## 📝 Immediate Next Steps
- Implement **V2 Scraper Logic**: Use the `Cheerio` tests in `test-scrape.js` to build real-time project fetching from Vimeo/Wikipedia into the `/api/mapper/scrape-node` endpoint.
- Clear out the legacy `MusicMapper` junk (`db.json`, `tracks.json`) from the `server/data` folder.
