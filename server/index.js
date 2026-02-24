import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { mapperRouter } from './routes/mapper.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// ─── Health ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', environment: process.env.VERCEL ? 'vercel' : 'local' });
});

// ─── Routes ──────────────────────────────────────────
app.use('/api/mapper', mapperRouter);

// Fallback to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────
// On Vercel, we export the app and let Vercel handle the listening.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n  🗺️ Prodco-Verse running → http://127.0.0.1:${PORT}`);
    });
}

export default app;
