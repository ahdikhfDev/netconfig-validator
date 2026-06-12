import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { validateRouter } from './routes/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve built frontend
const distPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(distPath));

app.use('/api', validateRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// SPA fallback — all non-API, non-file routes serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NetSim Lite API running at http://0.0.0.0:${PORT}`);
});
