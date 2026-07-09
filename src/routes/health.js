import { Router } from 'express';
import config from '../config/env.js';
import { checkConnection as checkEvolution } from '../services/evolution.js';
import { checkConnection as checkSupabase } from '../services/supabase.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const [evolutionOk, supabaseOk] = await Promise.all([
    checkEvolution(),
    checkSupabase(),
  ]);

  const status = evolutionOk && supabaseOk ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    service: 'whatsapp-gemini-bridge',
    checks: {
      evolution: evolutionOk ? 'up' : 'down',
      supabase: supabaseOk ? 'up' : 'down',
    },
    config: {
      geminiModel: config.gemini.model,
      contextLimit: config.contextMessageLimit,
      debounceMs: config.debounceMs,
      maxDailyMessages: config.maxDailyMessages,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
