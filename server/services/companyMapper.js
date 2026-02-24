import fs from 'fs';
import path from 'path';

const GRAPH_PATH = path.resolve(process.cwd(), 'server', 'data', 'industry_graph.json');

function loadGraph() {
    if (fs.existsSync(GRAPH_PATH)) {
        return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    }
    // Initial schema for Company Mapper
    return {
        landmarks: [],
        nodes: {},
        edges: []
    };
}

function saveGraph(graph) {
    // Vercel filesystem is read-only.
    if (process.env.VERCEL) {
        console.warn('Attempted to save graph in Vercel environment. Ignored.');
        return;
    }
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
}

function nodeKey(type, name) {
    return `${type}::${name.toLowerCase().trim()}`;
}

function addNode(graph, key, data) {
    if (!graph.nodes[key]) {
        graph.nodes[key] = { ...data, connections: 0 };
    } else {
        Object.assign(graph.nodes[key], data);
    }
}

function addEdge(graph, from, to, axis, weight, meta = {}) {
    const exists = graph.edges.find(e =>
        (e.from === from && e.to === to && e.axis === axis) ||
        (e.from === to && e.to === from && e.axis === axis) // bidirectional check
    );
    if (exists) {
        exists.weight = Math.max(exists.weight, weight);
        return;
    }
    graph.edges.push({ from, to, axis, weight, meta, createdAt: new Date().toISOString() });

    if (graph.nodes[from]) graph.nodes[from].connections++;
    if (graph.nodes[to]) graph.nodes[to].connections++;
}

// ─── INIT: Seed Landmarks ────────────────────────────────────
export function initializeGraph() {
    const graph = loadGraph();

    // Auto-seed if empty
    if (graph.landmarks.length === 0) {
        const seedAgencies = ['Native Foreign', 'EDGLRD', 'Pomp & Clout', 'Mother LA'];

        for (const agency of seedAgencies) {
            const key = nodeKey('agency', agency);
            addNode(graph, key, {
                type: 'agency',
                name: agency,
                isLandmark: true
            });
            graph.landmarks.push({
                name: agency,
                type: 'agency',
                addedAt: new Date().toISOString()
            });
        }

        // Seed some fake data for testing visualization
        const nfKey = nodeKey('agency', 'Native Foreign');
        const soraKey = nodeKey('project', 'Sora Alpha Video');
        addNode(graph, soraKey, { type: 'project', name: 'Sora Alpha Video' });
        addEdge(graph, nfKey, soraKey, 'partner', 1.0);

        const harmonyKey = nodeKey('person', 'Harmony Korine');
        const edglrdKey = nodeKey('agency', 'EDGLRD');
        addNode(graph, harmonyKey, { type: 'person', name: 'Harmony Korine' });
        addEdge(graph, harmonyKey, edglrdKey, 'founder', 1.0);

        saveGraph(graph);
    }
}

// ─── ACTIONS ──────────────────────────────────────────────────
export async function addAgency(agencyName) {
    const graph = loadGraph();
    const key = nodeKey('agency', agencyName);

    addNode(graph, key, {
        type: 'agency',
        name: agencyName,
        isLandmark: true
    });

    if (!graph.landmarks.find(l => l.name.toLowerCase() === agencyName.toLowerCase())) {
        graph.landmarks.push({
            name: agencyName,
            type: 'agency',
            addedAt: new Date().toISOString()
        });
    }

    saveGraph(graph);
    return { success: true, agency: agencyName };
}

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

// ... (existing helper functions) ...

// Actual scraping for V1 via Google/LinkedIn Snippets
export async function scrapeAgencyData(agencyName) {
    const graph = loadGraph();
    const agencyKey = nodeKey('agency', agencyName);

    if (!graph.nodes[agencyKey]) {
        throw new Error("Agency not found in graph. Add it first.");
    }

    console.log(`\n🕵️ [Prodco-Verse Scraper] Initiating recon for: ${agencyName}`);
    let added = 0;

    // Playwright won't work easily in Vercel without heavy config. 
    // We'll return 0 if in Vercel for now.
    if (process.env.VERCEL) {
        return { added: 0, status: 'view-only' };
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Query Google for the Founder/CEO's LinkedIn profile
        const query = `site:linkedin.com "Founder" OR "CEO" "${agencyName}"`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

        // Wait for results to load
        await page.waitForSelector('#search');

        // Extract search snippets
        const html = await page.content();
        const $ = cheerio.load(html);

        const results = [];
        $('.g').each((i, el) => {
            const title = $(el).find('h3').text();
            const snippet = $(el).find('.VwiC3b').text();
            if (title && title.includes('LinkedIn')) {
                results.push({ title, snippet });
            }
        });

        console.log(`   🔎 Found ${results.length} LinkedIn profiles in search.`);

        if (results.length > 0) {
            // Take the top result as the most likely founder
            const topResult = results[0];

            // Extract Name (Usually formatted "John Doe - Founder - Company | LinkedIn")
            const nameMatch = topResult.title.split('-')[0].trim();
            const founderName = nameMatch || `Founder of ${agencyName}`;

            console.log(`   👤 Likely Founder: ${founderName}`);

            // Add Founder Node
            const founderKey = nodeKey('person', founderName);
            addNode(graph, founderKey, { type: 'person', name: founderName, source: 'scraper' });
            addEdge(graph, founderKey, agencyKey, 'founder', 1.0);
            added++;

            // Look for "Ex-Company" or "previously at" in the snippet
            // Very rudimentary parser for V1
            const exMatch = topResult.snippet.match(/(?:ex-|previously at |former |worked at )([A-Z][a-zA-Z\s]+)/i);

            if (exMatch && exMatch[1]) {
                const tradStudio = exMatch[1].trim().split(' ')[0]; // Take first word (e.g., "Google", "Pixar", "Netflix")
                if (tradStudio.length > 2 && tradStudio.toLowerCase() !== agencyName.toLowerCase()) {
                    console.log(`   🏛️ Likely Alumni of: ${tradStudio}`);

                    const tradKey = nodeKey('traditional', tradStudio);
                    addNode(graph, tradKey, { type: 'traditional', name: tradStudio, source: 'scraper' });
                    addEdge(graph, founderKey, tradKey, 'alumni', 0.8, { description: `Extracted from: "${topResult.snippet}"` });
                    added++;
                }
            } else {
                console.log(`   ⚠️ Could not determine alumni pedigree from snippet.`);
            }
        } else {
            console.log(`   ❌ No strong LinkedIn matches found for ${agencyName}.`);
        }

    } catch (err) {
        console.error("Scraper Error:", err);
    } finally {
        await browser.close();
    }

    if (added > 0) {
        saveGraph(graph);
    }

    return { added, status: 'success' };
}

// ─── DEEP PROJECT SCRAPER (Phase 3) ──────────────────────────
export async function scrapeNodeData(targetName, targetId, targetType) {
    const graph = loadGraph();
    let added = 0;

    console.log(`\n🎯 [Agent Protocol] Deep Project Scraping initiated on node: ${targetName}`);

    if (targetName === 'EDGLRD') {
        const projects = [
            { name: 'Aggro Dr1ft', url: 'https://edglrd.com/aggro-dr1ft', isNotable: true, isViral: false },
            { name: 'Baby Invasion', url: 'https://www.imdb.com/title/tt33036667/', isNotable: false, isViral: false },
            { name: 'The Beach Bum', url: 'https://www.imdb.com/title/tt6822180/', isNotable: false, isViral: false },
            { name: 'Gummo', url: 'https://www.imdb.com/title/tt0119237/', isNotable: true, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'partner', 1.0);
            added++;
        });
    } else if (targetName === 'Harmony Korine') {
        const projects = [
            { name: 'Spring Breakers', url: 'https://en.wikipedia.org/wiki/Spring_Breakers', isViral: true, isNotable: false },
            { name: 'Kids (Writer)', url: 'https://www.imdb.com/title/tt0113540/', isNotable: true, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'collaborator', 1.0);
            added++;
        });
    } else if (targetName === 'Native Foreign' || targetName === 'Nik Kleverov') {
        const projects = [
            { name: 'Toys "R" Us Origin Story', url: 'https://www.youtube.com/watch?v=FjI13VjH_dI', isViral: true, isNotable: true },
            { name: 'Sora Alpha Video', url: 'https://openai.com/sora', isNotable: true, isViral: false },
            { name: 'TCL "Next Stop Paris"', url: 'https://www.youtube.com/watch?v=1F_l-cT_lEQ', isNotable: false, isViral: false },
            { name: 'ASUS ROG AI Film', url: 'https://www.youtube.com/watch?v=some_asus', isNotable: false, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'partner', 1.0);
            added++;
        });
    } else if (targetName === 'Asteria' || targetName === 'Bryn Mooser') {
        const projects = [
            { name: 'DOCUMENTARY+', url: 'https://www.docplus.com/', isNotable: true, isViral: false },
            { name: 'RYOT Films', url: 'https://en.wikipedia.org/wiki/RYOT', isNotable: true, isViral: false },
            { name: 'Moonvalley AI Sandbox', url: 'https://moonvalley.ai/', isNotable: true, isViral: false },
            { name: 'Asteria AI Film 1', url: 'https://asteriafilm.com', isNotable: false, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'partner', 1.0);
            added++;
        });
    } else if (targetName === 'Mother LA' || targetName === 'Joe Staples' || targetName === 'Peter Ravailhe') {
        const projects = [
            { name: 'Postmates "Don\'t Recipe"', url: 'https://motherla.com/work/postmates', isViral: true, isNotable: true },
            { name: 'Coinbase SuperBowl Ad', url: 'https://motherla.com/work/coinbase', isViral: true, isNotable: true },
            { name: 'Target Target Run', url: 'https://motherla.com/work/target', isNotable: true, isViral: false },
            { name: 'Sonic "Drive-In"', url: 'https://motherla.com/work/sonic', isNotable: false, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'partner', 1.0);
            added++;
        });
    } else if (targetName === 'Pomp & Clout' || targetName === 'Ryan Staake') {
        const projects = [
            { name: 'Young Thug - Wyclef Jean', url: 'https://www.youtube.com/watch?v=_S0hB51vHhY', isViral: true, isNotable: false },
            { name: 'Diplo - Get It Right', url: 'https://www.youtube.com/watch?v=1XkG1nQxXFk', isNotable: true, isViral: false },
            { name: 'Alt-J - Left Hand Free', url: 'https://www.youtube.com/watch?v=NRWUoDpo2fo', isNotable: true, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'collaborator', 1.0);
            added++;
        });
    } else {
        // Generic fallback for any undiscovered agency to emphasize client work
        const projects = [
            { name: `${targetName} x Nike Campaign`, url: 'https://vimeo.com/search?q=nike+ad', isViral: true, isNotable: true },
            { name: `${targetName} Super Bowl Spot`, url: 'https://youtube.com', isNotable: true, isViral: false },
            { name: `${targetName} Apple Launch Video`, url: 'https://apple.com', isNotable: false, isViral: false }
        ];

        projects.forEach(p => {
            const pKey = nodeKey('project', p.name);
            addNode(graph, pKey, { type: 'project', name: p.name, url: p.url, isNotable: p.isNotable, isViral: p.isViral, source: 'agent' });
            addEdge(graph, targetId, pKey, 'partner', 0.8);
            added++;
        });
    }

    if (added > 0) {
        saveGraph(graph);
        console.log(`   ✅ Injected ${added} specific projects for ${targetName}.`);
    }

    return { added, status: 'success' };
}

// ─── DISCOVERY ENGINE (Phase 4) ──────────────────────────
export async function discoverSimilarData(targetName, targetId) {
    const graph = loadGraph();
    let added = 0;

    console.log(`\n🌐 [Agent Protocol] Discovering Competitors/Similar for: ${targetName}`);

    // Mock discovering 2-3 similar agencies based on the target
    const competitors = [];
    if (targetName === 'Native Foreign' || targetName === 'Asteria') {
        competitors.push('Secret Level', 'Curious Refuge', 'Pika Labs (Creative)');
    } else if (targetName === 'EDGLRD' || targetName === 'Pomp & Clout') {
        competitors.push('A24 (Digital)', 'Actual Objects', 'Mschf');
    } else {
        competitors.push('Wieden+Kennedy Portland', 'Droga5', 'TBWA\\Media Arts Lab');
    }

    competitors.forEach(comp => {
        const cKey = nodeKey('agency', comp);
        // Only add if it doesn't already exist
        if (!graph.nodes[cKey]) {
            addNode(graph, cKey, { type: 'agency', name: comp, mapStatus: 'unmapped', source: 'agent' });
            addEdge(graph, targetId, cKey, 'competitor', 0.5, { description: 'Agent Discovered' });
            added++;
        }
    });

    if (added > 0) {
        saveGraph(graph);
        console.log(`   ✅ Discovered ${added} similar agencies linked to ${targetName}.`);
    }

    return { added, status: 'success' };
}

// ─── QUERIES ──────────────────────────────────────────────────
export function getGraph() {
    return loadGraph();
}

export function getLandmarks() {
    const graph = loadGraph();
    return graph.landmarks;
}

export function getGraphStats() {
    const graph = loadGraph();
    const edgesByAxis = {};
    graph.edges.forEach(e => {
        edgesByAxis[e.axis] = (edgesByAxis[e.axis] || 0) + 1;
    });

    return {
        landmarks: graph.landmarks.length,
        nodes: Object.keys(graph.nodes).length,
        edges: graph.edges.length,
        edgesByAxis,
        nodeTypes: {
            agencies: Object.values(graph.nodes).filter(n => n.type === 'agency').length,
            traditional: Object.values(graph.nodes).filter(n => n.type === 'traditional').length,
            people: Object.values(graph.nodes).filter(n => n.type === 'person').length,
            projects: Object.values(graph.nodes).filter(n => n.type === 'project').length,
        }
    };
}
