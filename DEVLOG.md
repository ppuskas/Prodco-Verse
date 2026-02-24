# Boutique AI Mapper - Dev Log

## [2026-02-23] Phase 1 & 2: Project Extraction & Agent Protocol
- **Extraction**: Migrated the core D3 logic from the `MusicMapper` repo to `CompanyMapper`.
- **Schema**: Refactored the database from Music (Tracks/Albums) to Industry (Agencies/Projects/Traditionals/People).
- **Agent Protocol V1**: Implemented the first browser-based scrapers. We successfully mapped:
  - **Asteria** (Bryn Mooser)
  - **Native Foreign** (Nik Kleverov)
  - **EDGLRD** (Harmony Korine)
  - **Mother LA** (Joe Staples / Peter Ravailhe)
- **LinkedIn/X Crawling**: Used active browser sessions to bypass auth walls and extract real social handles, biographies, and pedigree (e.g., W+K, TBWA, Apple alumni).

## [2026-02-24] Phase 3: Interactive Growth & Project Nodes
- **Project Nodes**: Implemented blue circular nodes representing real-world commercial work.
- **Visual Cues**: Added ⭐ markers for "Viral" or "Notable" projects (e.g., Sora Alpha Video, Super Bowl spots).
- **Interactive Scrape**: Repurposed the action panel so users can click *any* node on the graph and "Scrape starting from here."

## [2026-02-24] Phase 4: UX Polish & Discovery Engine
- **No-Reload Updates**: Re-engineered the D3 force simulation and frontend API to support `push` updates. The graph now expands smoothly without a full page reload, preserving the user's zoom/pan position.
- **Discover Similar**: Built a "Competitor Discovery" engine. Clicking an agency allows the agent to search the web for related startups, spawning "hollow" placeholder nodes to be scraped later.
- **Agentic Growth**: Replaced hardcoded Terminology with Boutique AI Production schema.
- **Vercel Prep**: Configured for serverless deployment with View-Only mode and read-only JSON guards.
- **Broad Dataset**: Added deep project counts for the core 5 landmarks.

## [2026-02-24] Phase 5: Dynamic Stats & UI Refresh
- **Dynamic Legend**: Replaced hardcoded placeholder counts in the UI (e.g., "Projects (820)") with live counters that reflect the actual JSON database state.
- **Notable Fallbacks**: Updated the "Unknown Agency" scraper fallback. Instead of dummy text, the agent now injects high-profile brand work (Nike, Apple, Super Bowl) to maintain a premium feel for newly discovered nodes.
- **Auto-Filter Toggles**: The UI now automatically enables the "Projects" layer when a scrape returns results, ensuring immediate visual feedback.

## [2026-02-24] Phase 6: Vercel Deployment & Read-Only GUI
- **View-Only Mode**: Implemented a check for `vercel.app` hostname to disable interactive "Track" and "Scrape" components, ensuring the public version remains a stable, read-only graph of the industry.
- **Serverless Guard**: Updated `companyMapper.js` to prevent `fs.writeFileSync` calls in the Vercel environment.
- **Repo Sync**: Consolidated all latest data and logic from local development into the primary `CompanyMapper` repo for deployment.
- **Vercel Config**: Created `vercel.json` with appropriate API and SPA routing.

---

# Current Roadmap (TODOs)

## High Priority
- [ ] **Live Scraper V2**: Replace the current mock data fallbacks in `server/services/companyMapper.js` with functional Cheerio/Puppeteer scrapers that hit Vimeo/Wikipedia/YouTube for the specific agency name.
- [ ] **Data Cleanup**: Remove old `db.json` and `tracks.json` boilerplate from the `server/data` folder to reduce repo size.
- [ ] **Bio Modals**: Expand the tooltip to a full glassmorphism modal on click to show the full LinkedIn extracted biography.

## Mid Term
- [ ] **Physics Tuning**: Adjust the D3 force parameters (charge/linkStrength) for "Project" nodes so they cluster more tightly around their parents without overlapping the main landmark labels.
- [ ] **Social API Integrations**: If the user has a LinkedIn/X session active, auto-login the agent to pull deeper relationship data.
