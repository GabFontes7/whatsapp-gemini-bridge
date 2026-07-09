import config from '../config/env.js';
import { logger } from './logger.js';

const processedMessages = new Map();
const lastMessageAt = new Map();

function purgeExpiredMessages(now) {
  for (const [id, expiresAt] of processedMessages) {
    if (expiresAt <= now) processedMessages.delete(id);
  }
}

export function isDuplicateMessage(messageId) {
  if (!messageId) return false;

  const now = Date.now();
  purgeExpiredMessages(now);

  if (processedMessages.has(messageId)) {
    logger.info('message_duplicate_ignored', { messageId });
    return true;
  }

  processedMessages.set(messageId, now + config.dedupTtlMs);
  return false;
}

export function isDebounced(whatsappId) {
  const now = Date.now();
  const lastAt = lastMessageAt.get(whatsappId);

  if (lastAt && now - lastAt < config.debounceMs) {
    logger.info('message_debounced', {
      whatsappId,
      waitMs: config.debounceMs - (now - lastAt),
    });
    return true;
  }

  lastMessageAt.set(whatsappId, now);
  return false;
}
