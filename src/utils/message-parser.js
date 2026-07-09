export function extractTextMessage(payload) {
  const data = payload?.data ?? payload;
  const message = data?.message;

  if (!message || typeof message !== 'object') {
    return null;
  }

  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    null;

  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  return text.trim();
}

export function resolveRemoteJid(data) {
  const key = data?.key;
  if (!key) return null;

  const remoteJid = key.remoteJid ?? '';
  const remoteJidAlt = key.remoteJidAlt ?? '';

  if (remoteJid.endsWith('@lid') && remoteJidAlt) {
    return remoteJidAlt;
  }

  return remoteJid || remoteJidAlt || null;
}

export function extractMessageId(data) {
  return data?.key?.id ?? null;
}

export function isGroupMessage(remoteJid) {
  return Boolean(remoteJid?.endsWith('@g.us'));
}

export function isValidIncomingTextMessage(payload) {
  const event = String(payload?.event ?? '').toLowerCase();
  const isMessageEvent =
    event === 'messages.upsert' ||
    event === 'messages_upsert' ||
    !event;

  if (!isMessageEvent) return false;

  const data = payload?.data ?? payload;
  const key = data?.key;

  if (!key || key.fromMe === true) return false;

  const remoteJid = resolveRemoteJid(data);
  if (!remoteJid || isGroupMessage(remoteJid)) return false;

  const text = extractTextMessage(payload);
  return Boolean(text);
}

export function summarizePayload(payload) {
  const data = payload?.data ?? payload;
  return {
    event: payload?.event ?? 'unknown',
    instance: payload?.instance ?? null,
    messageId: extractMessageId(data),
    remoteJid: resolveRemoteJid(data),
    pushName: data?.pushName ?? null,
    messageType: data?.messageType ?? null,
    textLength: extractTextMessage(payload)?.length ?? 0,
  };
}
