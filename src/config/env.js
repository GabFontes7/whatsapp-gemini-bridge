import 'dotenv/config';

const config = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',

  evolution: {
    url: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 512),
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },

  contextMessageLimit: Number(process.env.CONTEXT_MESSAGE_LIMIT ?? 10),
  debounceMs: Number(process.env.DEBOUNCE_MS ?? 3000),
  dedupTtlMs: Number(process.env.DEDUP_TTL_MS ?? 86_400_000),
  maxDailyMessages: Number(process.env.MAX_DAILY_MESSAGES ?? 50),
  webhookUrl: process.env.WEBHOOK_URL ?? 'http://host.docker.internal:3000/webhook',
  webhookSecret: process.env.WEBHOOK_SECRET ?? '',

  geminiFallbackMessage:
    process.env.GEMINI_FALLBACK_MESSAGE ??
    'Eita, deu uma instabilidade aqui do meu lado 😅 Tenta me mandar de novo em instantes?',

  postgres: {
    user: process.env.POSTGRES_USER ?? 'evolution',
    password: process.env.POSTGRES_PASSWORD ?? 'evolution123',
    db: process.env.POSTGRES_DB ?? 'evolution',
  },

  evolutionServerUrl: process.env.EVOLUTION_SERVER_URL ?? 'http://localhost:1667',
};

export function validateEnv() {
  const required = {
    EVOLUTION_API_URL: config.evolution.url,
    EVOLUTION_API_KEY: config.evolution.apiKey,
    EVOLUTION_INSTANCE_NAME: config.evolution.instanceName,
    GEMINI_API_KEY: config.gemini.apiKey,
    SUPABASE_URL: config.supabase.url,
    SUPABASE_KEY: config.supabase.key,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value || String(value).includes('sua_') || String(value).includes('seu-projeto'))
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`[AVISO] Variáveis não configuradas: ${missing.join(', ')}`);
  }
}

export default config;
