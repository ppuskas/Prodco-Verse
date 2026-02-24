# Boutique AI Mapper - Dev Log

## [2026-02-23] Extraction & Refactor V1
- Extracted codebase from `MusicMapper` into `CompanyMapper`.
- **Database Shift**: Replaced music-based `db.json` with an industry-centric `industry_graph.json`.
- **Schema Update**:
  - `Landmarks` -> Boutique AI Agencies (e.g., Native Foreign, Edglrd, Pomp & Clout, Mother LA).
  - `Albums` -> Traditional Studios (for spin-offs).
  - `Tracks` -> Projects / IP.
  - `People` -> Founders / Key Talent.
- **Backend**: Removed Deezer/Discogs integrations. Built basic node generation logic in `services/companyMapper.js`. 
- **Frontend**: Scrubbed music language from `index.html`. Updated Legend and UI elements to reflect the AI Production map. Mapped "Track Agency" and "Scrape AI Spin-offs" buttons.

---

# Requirements / TODOs

## Short Term
- [ ] **Real Data Ingestion**: Replace the mock `scrapeAgencyData` function in `server/services/companyMapper.js` with a real LLM/scraper call. Currently, it just spins up a dummy "Founder" and "Traditional Studio" to demonstrate the edge connection.
- [ ] **UI Polish**: Update the CSS colors in the graph to match the new Legend (Orange, Green, Blue, Red). Some of the node/link colors might still be inheriting from the old `NODE_COLORS` mapping in `index.html`.
- [ ] **Form Inputs**: The "Track Agency" form only takes an Agency Name right now. Add fields to optionally link a Founder or Project directly when planting a new landmark.

## Mid Term
- [ ] **Alumni Web Logic**: Build a dedicated query view that highlights *all* spin-offs from a specific Traditional company (e.g., "Show me everyone who left Pixar to start an AI firm").
- [ ] **Local Asset Scanning**: Build an endpoint that scans a local project directory (e.g., `C:\Users\ppusk\Sync\CaptainFall`) and automatically ties generated output files (mp4, png) to their respective Tools/Agencies on the graph.

## Long Term (Agentic Integrations)
- [ ] Use `Agent Steel` or another subagent to continuously crawl LinkedIn/Crunchbase overnight and auto-populate `industry_graph.json` with new AI video startups and funding rounds.
- [ ] Export the D3 node graph into a format compatible with ComfyUI or Nuke for direct asset management.
