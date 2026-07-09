import { createClient } from '@supabase/supabase-js';
import config from '../config/env.js';
import { logger } from '../utils/logger.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

function toGeminiRole(role) {
  return role === 'model' ? 'model' : 'user';
}

export async function getChatHistory(whatsappId) {
  const { data, error } = await supabase
    .from('chat_history')
    .select('role, content, created_at')
    .eq('whatsapp_id', whatsappId)
    .order('created_at', { ascending: false })
    .limit(config.contextMessageLimit);

  if (error) {
    throw new Error(`Erro ao buscar histórico no Supabase: ${error.message}`);
  }

  return (data ?? []).reverse();
}

export async function saveChatMessage(whatsappId, role, content) {
  const { error } = await supabase.from('chat_history').insert({
    whatsapp_id: whatsappId,
    role,
    content,
  });

  if (error) {
    throw new Error(`Erro ao salvar mensagem no Supabase: ${error.message}`);
  }
}

export async function saveUsageLog({ whatsappId, model, inputTokens, outputTokens, estimatedCostUsd }) {
  const { error } = await supabase.from('usage_logs').insert({
    whatsapp_id: whatsappId,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimatedCostUsd,
  });

  if (error) {
    logger.warn('usage_log_save_failed', { error: error.message });
  }
}

function startOfTodayIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function getDailyMessageCount(whatsappId) {
  const { count, error } = await supabase
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('whatsapp_id', whatsappId)
    .gte('created_at', startOfTodayIso());

  if (error) {
    throw new Error(`Erro ao verificar limite diário: ${error.message}`);
  }

  return count ?? 0;
}

export async function getUsageStats() {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('whatsapp_id, input_tokens, output_tokens, estimated_cost_usd')
    .gte('created_at', startOfTodayIso());

  if (error) {
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
  }

  const rows = data ?? [];
  const byContact = new Map();

  for (const row of rows) {
    const current = byContact.get(row.whatsapp_id) ?? {
      whatsappId: row.whatsapp_id,
      messages: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };

    current.messages += 1;
    current.inputTokens += row.input_tokens ?? 0;
    current.outputTokens += row.output_tokens ?? 0;
    current.estimatedCostUsd += Number(row.estimated_cost_usd ?? 0);
    byContact.set(row.whatsapp_id, current);
  }

  const topContacts = [...byContact.values()]
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 10)
    .map((c) => ({
      ...c,
      estimatedCostUsd: Number(c.estimatedCostUsd.toFixed(6)),
    }));

  return {
    date: startOfTodayIso().slice(0, 10),
    messages: rows.length,
    uniqueContacts: byContact.size,
    inputTokens: rows.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
    outputTokens: rows.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
    estimatedCostUsd: Number(
      rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0).toFixed(6)
    ),
    topContacts,
  };
}

export function buildGeminiHistory(rows) {
  return rows.map((row) => ({
    role: toGeminiRole(row.role),
    parts: [{ text: row.content }],
  }));
}

export async function checkConnection() {
  const { error } = await supabase.from('chat_history').select('id').limit(1);
  return !error;
}

export { supabase };
