import config from '../config/env.js';
import { logger } from './logger.js';

export function validateWebhookSecret(req, res, next) {
  if (!config.webhookSecret) {
    return next();
  }

  const received = req.headers['x-webhook-secret'];

  if (received !== config.webhookSecret) {
    logger.warn('webhook_unauthorized', { ip: req.ip });
    return res.status(401).json({ ok: false, error: 'Webhook não autorizado.' });
  }

  return next();
}
