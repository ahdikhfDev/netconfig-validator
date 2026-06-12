import express from 'express';
import cors from 'cors';
import { validateRouter } from './routes/validate.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', validateRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NetSim Lite API running at http://0.0.0.0:${PORT}`);
});
