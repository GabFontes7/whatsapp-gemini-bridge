import { Router } from 'express';
import config from '../config/env.js';
import { getUsageStats } from '../services/supabase.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getUsageStats();

    res.json({
      ok: true,
      limits: {
        maxDailyMessagesPerContact: config.maxDailyMessages,
      },
      today: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('stats_failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
