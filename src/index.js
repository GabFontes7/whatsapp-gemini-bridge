import express from 'express';
import config, { validateEnv } from './config/env.js';
import healthRouter from './routes/health.js';
import statsRouter from './routes/stats.js';
import webhookRouter from './routes/webhook.js';
import { logger } from './utils/logger.js';

validateEnv();

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use(healthRouter);
app.use(statsRouter);
app.use(webhookRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.listen(config.port, () => {
  logger.info('server_started', {
    port: config.port,
    webhook: `http://localhost:${config.port}/webhook`,
    evolution: config.evolution.url,
    instance: config.evolution.instanceName,
    geminiModel: config.gemini.model,
  });
});
