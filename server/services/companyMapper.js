import fs from 'fs';
import path from 'path';

const GRAPH_PATH = path.resolve(process.cwd(), 'server', 'data', 'industry_graph.json');
const QUEUE_PATH = path.resolve(process.cwd(), 'server', 'data', 'research_queue.json');

// ─── Graph I/O ───────────────────────────────────────────────
function loadGraph() {
    if (fs.existsSync(GRAPH_PATH)) {
        return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    }
    return { landmarks: [], nodes: {}, edges: [] };
}

function saveGraph(graph) {
    if (process.env.VERCEL) {
        console.warn('[Prodco-Verse] Write blocked in Vercel environment.');
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
        (e.from === to && e.to === from && e.axis === axis)
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
    if (graph.landmarks.length === 0) {
        const seedAgencies = ['Native Foreign', 'EDGLRD', 'Pomp & Clout', 'Mother LA'];
        for (const agency of seedAgencies) {
            const key = nodeKey('agency', agency);
            addNode(graph, key, { type: 'agency', name: agency, isLandmark: true });
            graph.landmarks.push({ name: agency, type: 'agency', addedAt: new Date().toISOString() });
        }
        saveGraph(graph);
    }
}

// ═══════════════════════════════════════════════════════════════
// AGENT INJECT — Batch-add nodes + edges during agentic sessions
// ═══════════════════════════════════════════════════════════════
export function injectData({ nodes = [], edges = [] }) {
    const graph = loadGraph();
    let nodesAdded = 0;
    let edgesAdded = 0;

    for (const n of nodes) {
        const key = n.key || nodeKey(n.type, n.name);
        addNode(graph, key, n);

        // Auto-register as landmark if flagged
        if (n.isLandmark && !graph.landmarks.find(l => l.name.toLowerCase() === n.name.toLowerCase())) {
            graph.landmarks.push({ name: n.name, type: n.type, addedAt: new Date().toISOString() });
        }
        nodesAdded++;
    }

    for (const e of edges) {
        const from = e.from || nodeKey(e.fromType, e.fromName);
        const to = e.to || nodeKey(e.toType, e.toName);
        addEdge(graph, from, to, e.axis, e.weight ?? 1.0, e.meta || {});
        edgesAdded++;
    }

    saveGraph(graph);
    console.log(`[Inject] +${nodesAdded} nodes, +${edgesAdded} edges`);
    return { nodesAdded, edgesAdded, totalNodes: Object.keys(graph.nodes).length, totalEdges: graph.edges.length };
}

// ═══════════════════════════════════════════════════════════════
// RESEARCH QUEUE — Pin targets for agent to process next session
// ═══════════════════════════════════════════════════════════════
function loadQueue() {
    if (fs.existsSync(QUEUE_PATH)) {
        return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    }
    return [];
}

function saveQueue(queue) {
    if (process.env.VERCEL) return;
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export function pinForResearch({ targetNode, targetName, action = 'research', notes = '' }) {
    const queue = loadQueue();
    const id = `req_${Date.now()}`;
    queue.push({
        id,
        targetNode,
        targetName,
        action,
        notes,
        pinnedAt: new Date().toISOString(),
        status: 'pending'
    });
    saveQueue(queue);
    console.log(`[Queue] 📌 Pinned "${targetName}" for research`);
    return { id, queued: queue.length };
}

export function getQueue() {
    return loadQueue().filter(r => r.status === 'pending');
}

export function completeQueueItem(id) {
    const queue = loadQueue();
    const item = queue.find(r => r.id === id);
    if (!item) return { error: 'Not found' };
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    saveQueue(queue);
    return { success: true, id };
}

export function clearCompletedQueue() {
    const queue = loadQueue().filter(r => r.status === 'pending');
    saveQueue(queue);
    return { remaining: queue.length };
}

// ═══════════════════════════════════════════════════════════════
// QUERIES — Read-only access to the graph
// ═══════════════════════════════════════════════════════════════
export function getGraph() {
    return loadGraph();
}

export function getLandmarks() {
    return loadGraph().landmarks;
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
