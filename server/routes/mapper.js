import { Router } from 'express';
import {
    addAgency,
    scrapeAgencyData,
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
