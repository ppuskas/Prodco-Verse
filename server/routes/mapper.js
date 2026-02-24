import { Router } from 'express';
import {
    addAgency,
    scrapeAgencyData,
    scrapeNodeData,
    discoverSimilarData,
    getGraph,
    getLandmarks,
    getGraphStats,
    initializeGraph
} from '../services/companyMapper.js';

export const mapperRouter = Router();

// ─── POST /api/mapper/agency — Add a new agency landmark ──
mapperRouter.post('/agency', async (req, res) => {
    const { agency } = req.body;

    if (!agency) {
        return res.status(400).json({ error: 'Missing agency name' });
    }

    try {
        const result = await addAgency(agency);
        res.json(result);
    } catch (err) {
        console.error('Add agency error:', err);
        res.status(500).json({ error: 'Failed to add agency', details: err.message });
    }
});

// ─── POST /api/mapper/scrape — Scrape Agency Data ─────
mapperRouter.post('/scrape', async (req, res) => {
    const { agency } = req.body;

    if (!agency) {
        return res.status(400).json({ error: 'Missing agency name' });
    }

    try {
        const result = await scrapeAgencyData(agency);
        res.json(result);
    } catch (err) {
        console.error('Scrape error:', err);
        res.status(500).json({ error: 'Scraping failed', details: err.message });
    }
});

// ─── POST /api/mapper/scrape-node — Scrape specific Node ─────
mapperRouter.post('/scrape-node', async (req, res) => {
    const { id, type, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'Missing node id or name' });
    }

    try {
        const result = await scrapeNodeData(name, id, type);
        res.json(result);
    } catch (err) {
        console.error('Scrape node error:', err);
        res.status(500).json({ error: 'Node scraping failed', details: err.message });
    }
});

// ─── POST /api/mapper/discover-similar — Discover similar agencies ─────
mapperRouter.post('/discover-similar', async (req, res) => {
    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'Missing node id or name' });
    }

    try {
        const result = await discoverSimilarData(name, id);
        res.json(result);
    } catch (err) {
        console.error('Discover similar error:', err);
        res.status(500).json({ error: 'Discovery failed', details: err.message });
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

// ─── GET /api/mapper/graph — Full raw graph (dev/debug) ─────
mapperRouter.get('/graph', (_req, res) => {
    try {
        res.json(getGraph());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── INIT ───────────────────────────────────────────────────
// Initialize graph with seed data if it doesn't exist
initializeGraph();
