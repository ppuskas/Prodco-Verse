import { Router } from 'express';
import {
    injectData,
    pinForResearch,
    getQueue,
    completeQueueItem,
    clearCompletedQueue,
    getGraph,
    getLandmarks,
    getGraphStats,
    initializeGraph
} from '../services/companyMapper.js';

export const mapperRouter = Router();

// ─── GET /api/mapper/graph — Full graph data ────────────────
mapperRouter.get('/graph', (_req, res) => {
    try {
        res.json(getGraph());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/mapper/stats — Graph overview ─────────────────
mapperRouter.get('/stats', (_req, res) => {
    try {
        res.json(getGraphStats());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/mapper/landmarks — All user landmarks ─────────
mapperRouter.get('/landmarks', (_req, res) => {
    try {
        res.json(getLandmarks());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// AGENT ENDPOINTS — Used during agentic research sessions
// ═══════════════════════════════════════════════════════════════

// ─── POST /api/mapper/inject — Batch inject nodes + edges ───
mapperRouter.post('/inject', (req, res) => {
    if (process.env.VERCEL) {
        return res.status(403).json({ error: 'Write operations disabled on Vercel' });
    }

    const { nodes, edges } = req.body;
    try {
        const result = injectData({ nodes, edges });
        res.json(result);
    } catch (err) {
        console.error('Inject error:', err);
        res.status(500).json({ error: 'Injection failed', details: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// RESEARCH QUEUE — Pin targets from the local UI
// ═══════════════════════════════════════════════════════════════

// ─── POST /api/mapper/pin — Pin a node for research ─────────
mapperRouter.post('/pin', (req, res) => {
    if (process.env.VERCEL) {
        return res.status(403).json({ error: 'Pinning disabled on Vercel' });
    }

    const { targetNode, targetName, action, notes } = req.body;
    if (!targetNode || !targetName) {
        return res.status(400).json({ error: 'Missing targetNode or targetName' });
    }

    try {
        const result = pinForResearch({ targetNode, targetName, action, notes });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/mapper/queue — Get pending research requests ──
mapperRouter.get('/queue', (_req, res) => {
    try {
        res.json(getQueue());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/mapper/queue/:id — Complete a queue item ────
mapperRouter.delete('/queue/:id', (req, res) => {
    if (process.env.VERCEL) {
        return res.status(403).json({ error: 'Write operations disabled on Vercel' });
    }

    try {
        const result = completeQueueItem(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── INIT ───────────────────────────────────────────────────
initializeGraph();
