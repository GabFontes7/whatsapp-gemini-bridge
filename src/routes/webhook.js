import { Router } from 'express';
import config from '../config/env.js';
import { DEFAULT_GEMINI_FALLBACK_MESSAGE, DAILY_LIMIT_MESSAGE } from '../constants/messages.js';
import { generateReply } from '../services/gemini.js';
import { sendWhatsAppMessage } from '../services/evolution.js';
import {
  getChatHistory,
  getDailyMessageCount,
  saveChatMessage,
  saveUsageLog,
} from '../services/supabase.js';
import { isDebounced, isDuplicateMessage } from '../utils/dedup.js';
import { logger } from '../utils/logger.js';
import {
  extractMessageId,
  extractTextMessage,
  isValidIncomingTextMessage,
  resolveRemoteJid,
  summarizePayload,
} from '../utils/message-parser.js';
import { validateWebhookSecret } from '../utils/webhook-auth.js';

const router = Router();

async function replyWithFallback({ remoteJid, userMessage, reason, error }) {
  const fallbackMessage = config.geminiFallbackMessage || DEFAULT_GEMINI_FALLBACK_MESSAGE;

  logger.warn('gemini_fallback_used', {
    whatsappId: remoteJid,
    reason,
    error,
  });

  await saveChatMessage(remoteJid, 'user', userMessage);
  await saveChatMessage(remoteJid, 'model', fallbackMessage);
  await sendWhatsAppMessage(remoteJid, fallbackMessage);

  return fallbackMessage;
}

router.post('/webhook', validateWebhookSecret, async (req, res) => {
  const startedAt = Date.now();
  const payload = req.body;
  let remoteJid = null;
  let userMessage = null;

  try {
    logger.debug('webhook_received', summarizePayload(payload));

    if (!isValidIncomingTextMessage(payload)) {
      logger.info('webhook_ignored', { reason: 'invalid_or_group_message' });
      return res.status(200).json({ ok: true, ignored: true });
    }

    const data = payload.data ?? payload;
    remoteJid = resolveRemoteJid(data);
    const messageId = extractMessageId(data);
    userMessage = extractTextMessage(payload);
    const pushName = data.pushName ?? 'Cliente';

    if (isDuplicateMessage(messageId)) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'duplicate' });
    }

    if (isDebounced(remoteJid)) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'debounced' });
    }

    logger.info('message_received', {
      messageId,
      whatsappId: remoteJid,
      pushName,
      textLength: userMessage.length,
    });

    const dailyCount = await getDailyMessageCount(remoteJid);
    if (dailyCount >= config.maxDailyMessages) {
      logger.warn('daily_limit_reached', {
        whatsappId: remoteJid,
        dailyCount,
        limit: config.maxDailyMessages,
      });

      await sendWhatsAppMessage(remoteJid, DAILY_LIMIT_MESSAGE);

      return res.status(200).json({
        ok: true,
        limited: true,
        dailyCount,
        limit: config.maxDailyMessages,
      });
    }

    const history = await getChatHistory(remoteJid);

    let botReply;
    let usage = null;
    let usedFallback = false;

    try {
      const result = await generateReply(history, userMessage);
      botReply = result.text;
      usage = result.usage;
    } catch (geminiError) {
      usedFallback = true;
      botReply = await replyWithFallback({
        remoteJid,
        userMessage,
        reason: 'gemini_error',
        error: geminiError.message,
      });
    }

    if (!usedFallback) {
      await saveChatMessage(remoteJid, 'user', userMessage);
      await saveChatMessage(remoteJid, 'model', botReply);
      await sendWhatsAppMessage(remoteJid, botReply);

      await saveUsageLog({
        whatsappId: remoteJid,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
      });
    }

    const durationMs = Date.now() - startedAt;
    logger.info(usedFallback ? 'message_processed_fallback' : 'message_processed', {
      whatsappId: remoteJid,
      durationMs,
      usedFallback,
      ...(usage && {
        geminiModel: usage.model,
        tokens: {
          input: usage.inputTokens,
          output: usage.outputTokens,
          total: usage.totalTokens,
        },
        estimatedCostUsd: usage.estimatedCostUsd,
      }),
    });

    return res.status(200).json({
      ok: true,
      remoteJid,
      reply: botReply,
      fallback: usedFallback,
      usage,
      durationMs,
    });
  } catch (error) {
    const message = error?.response?.data ?? error.message;
    logger.error('message_failed', {
      durationMs: Date.now() - startedAt,
      error: typeof message === 'string' ? message : JSON.stringify(message),
    });

    if (remoteJid && userMessage) {
      try {
        const fallbackReply = await replyWithFallback({
          remoteJid,
          userMessage,
          reason: 'unexpected_error',
          error: typeof message === 'string' ? message : JSON.stringify(message),
        });

        return res.status(200).json({
          ok: true,
          remoteJid,
          reply: fallbackReply,
          fallback: true,
          durationMs: Date.now() - startedAt,
        });
      } catch (fallbackError) {
        logger.error('fallback_failed', { error: fallbackError.message });
      }
    }

    return res.status(500).json({
      ok: false,
      error: 'Falha ao processar a mensagem.',
      details: typeof message === 'string' ? message : JSON.stringify(message),
    });
  }
});

export default router;
