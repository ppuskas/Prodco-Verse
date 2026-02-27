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

## [2026-02-25] Phase 7: Agentic Research Workflow
- **Playwright Removed**: Stripped the autonomous scraper system (Playwright, Cheerio). All research now happens live with the agent using the browser subagent.
- **Research Queue**: Implemented a 📌 Pin for Research system. Users click nodes on the local graph, add notes, and pin them to `research_queue.json`. The agent reads the queue at the start of each session and processes the requests.
- **Inject API**: Added `POST /api/mapper/inject` for batch node/edge injection during agentic sessions.
- **Data Cleanup**: Removed 13MB of legacy MusicMapper files (`db.json`, `tracks.json`, `mapper-graph.json`).
- **Frontend Rewrite**: Stripped the old Track/Scrape/Discover panel. Local dev shows the research pin UI with queue counter. Vercel deploy is a clean read-only graph.
- **Workflow**: User steers → Agent dives → User reviews → cycle continues.

## [2026-02-25] Phase 8: Data Audit & List View
- **Data Audit**: Purged 17 dummy/template nodes (fake Nike/Apple/SuperBowl/CaseStudy projects injected by old fallback scraper).
- **3 Research Rounds**:
  - Round 1: Dolsten & Co (Simon Dolsten, Accelerator/VIOME), Secret Level (Jason Zada, Eric Shamlin, Coca-Cola AI), Curious Refuge (Caleb Ward)
  - Round 2: Fixed project links (Coinbase, Toys R Us, Elf Yourself), expanded RYOT (VR pioneer, Body Team 12), fixed Gummo/Beach Bum attribution to Korine, fully built out Droga5 (David Droga, NYT Truth, IHOb, UNICEF Tap)
  - Round 3: yU+co (Garson Yu, title sequences), Digital Kitchen (Dexter/Six Feet Under titles), EDGLRD music videos (Gucci Mane, Yeat, Weeknd AI), XTR (Ascension Oscar-nom), TBWA\\Chiat\\Day (1984/Think Different), TBWA\\Media Arts Lab (Shot on iPhone)
- **List View**: Added 📋 List tab — Graph/List toggle in header. Sorted tables grouped by Agencies, Projects, People, Traditionals with connection counts, bios, and links.
- **Projects Default**: Projects filter now enabled by default so project nodes are visible on load.
- **Graph State**: 78 nodes, 73 edges, 6 landmarks.

## [2026-02-25] Phase 9: Hierarchy List View, Competitor Clarity & New Discoveries
- **List View Redesign**: Replaced flat card grid with a hierarchy-based display — agencies at top, nested People → Projects → Pedigree → Related sections underneath.
- **Competitor Link Clarity**: Updated all 11 competitor edge descriptions from generic "Agent Discovered" to specific reasons (e.g., "Both AI-native production studios making brand content with generative tools").
- **Related Agencies Section**: Added orange-styled "RELATED" sub-section to each agency block showing competitor connections with descriptive reasons.
- **TBWA Duplicate Fix**: Merged 2 double-escaped TBWA nodes (Chiat\Day + Media Arts Lab) — fixed 5 edge references.
- **Arc Creative Expansion**: Added 3 more founders (Neil Ghaznavi, Tim Crean, Becky Porter — all ex-The Mill) and 4 new projects (Apple Watch, Netflix, Game Awards 2025, CoreWeave).
- **6 New Agencies Discovered**:
  - **VORIQ** (Raghu Naik) — TVC-quality AI ads for global brands
  - **Genre.ai** (PJ Accetturo) — 275M+ views on viral AI content
  - **351 Studio** (Ilija Todorovski) — Premium cinematic AI video
  - **The Gardening Club** — AI collective under The Sweetshop, McDonald's NL AI ad
  - **Gennie Studio** (Max Einhorn, ex-Crypt TV) — AI reenactments & unscripted TV
  - **LAVA Media** (Sergey Rodin) — Lean AI shop for Fortune 500
- **Timestamps**: All nodes now stamped with `addedAt`. List view shows relative timestamps ("8m ago", "2d ago") and sorts newest-first.
- **What's New Banner**: Session-aware banner at top of list view using localStorage. Splits into "Added" (user-requested, green) and "🤖 Discovered by Agent" (orange).
- **Default List View**: Page now loads directly into 📋 List instead of Graph.
- **Source Attribution**: Fixed `source` field on 8 agencies to correctly distinguish user-mentioned vs agent-discovered.
- **OG Meta Tags**: Added Open Graph and Twitter Card tags with preview image for link sharing.
- **Auto-Timestamping**: `addNode()` now automatically stamps new nodes with `addedAt`.
- **Graph State**: 116 nodes, 116 edges, 6 landmarks.

## [2026-02-27] Phase 10: Landscape Center Node & PJ Accetturo Expansion
- **Hub-and-Spoke Fix**: All 17 competitor edges (9 from NF, 3 from Mother LA, 5 others) radiated from landmark agencies, making the graph look like NF was the "parent" of the industry. Replaced with an invisible **"AI Production Landscape"** center node that all 23 agencies connect to equally via `landscape` axis edges.
- **Invisible Anchor**: The center node has zero radius, zero opacity, no tooltip, no pointer events — it's purely gravitational. Force sim uses distance: 250, strength: 0.05, zero charge.
- **Stats/Filters**: Landscape node and edges are excluded from stats bar, filter counts, and list view rendering.
- **PJ Accetturo Expansion**: Expanded Genre.ai from 2 connections to 10. Added 8 new project nodes (Kalshi Viral AI Ad, Popeyes (W)rap Battle, Qatar Airways x Google In-Flight AI Ad, Pupperamin spoof, NBA Finals AI Commercial, Google AI Film Festival Short, VoiceoverPete YouTube, Ghosts of Ruin). Updated PJ bio with full career arc (NatGeo at 18, 15yr commercial director, VoiceoverPete 1M subs). Added socials: @PJaccetturo (X), @pjacefilms (IG).
- **Graph State**: 124 nodes, 107 edges (visible), 6 landmarks.

## [2026-02-27] Phase 11: Changelog Banner & Bottom Line AI
- **Changelog Banner**: Replaced localStorage-based "What's New" with a data-driven changelog stored in `industry_graph.json`. Latest entry always visible, older entries behind a collapsible "Show History" toggle. Green `ADDITION` / blue `UPDATE` type badges. Works on Vercel read-only mode.
- **Bottom Line AI Expansion**: Deep-dive on Paris-based AI filmmaking studio. Added founders Henri Bassil (Director) & Claudia Lalau (AI Lead/Producer). Added 6 projects: ChatGPT Spec Ad, The Last Shield AI Trailer, Volvo EX30, REVIN, Milka, BEEAH Hybrid. Enriched bio with tools (Kling, Runway, MiniMax, ElevenLabs, Freepik).
- **Graph State**: 132 nodes, 114 edges (visible), 6 landmarks.

---

# Current Roadmap (TODOs)

## High Priority
- [ ] **Bio Modals**: Expand the tooltip to a full glassmorphism modal on click to show the full biography.
- [x] **Physics Tuning**: Replaced competitor hub-and-spoke with gravitational landscape center node.

## Mid Term
- [ ] **Search/Filter in List View**: Add a search bar to the list view for quick lookup.
- [ ] **Edge Labels on Hover**: Show axis type label when hovering over edges in graph view.
- [ ] **Export**: Add CSV/JSON export from the list view.
- [ ] **Grow All Agencies**: Deep-dive remaining thin agency profiles (VORIQ, ~~Genre.ai~~, 351 Studio, etc.) with full project/people data.
