# Guia do Desenvolvedor — WhatsApp Gemini Bridge

Documentação técnica para quem for **manter, debugar ou evoluir** este projeto.

> **Operação do dia a dia (ligar/desligar, QR Code):** veja [MANUAL.md](./MANUAL.md)  
> **Visão geral e setup inicial:** veja [README.md](./README.md)

---

## Índice

1. [Git basta?](#1-git-basta)
2. [Arquitetura](#2-arquitetura)
3. [Estrutura do repositório](#3-estrutura-do-repositório)
4. [Fluxo de uma mensagem](#4-fluxo-de-uma-mensagem)
5. [Variáveis de ambiente](#5-variáveis-de-ambiente)
6. [Banco de dados (Supabase)](#6-banco-de-dados-supabase)
7. [Integrações externas](#7-integrações-externas)
8. [Modos de execução](#8-modos-de-execução)
9. [Tarefas comuns de manutenção](#9-tarefas-comuns-de-manutenção)
10. [Debug e logs](#10-debug-e-logs)
11. [Segurança](#11-segurança)
12. [Deploy e checklist](#12-deploy-e-checklist)
13. [Limitações conhecidas](#13-limitações-conhecidas)
14. [Roadmap sugerido](#14-roadmap-sugerido)

---

## 1. Git basta?

**Parcialmente.** O GitHub guarda o código, histórico de commits e o README — isso ajuda muito. Mas **não substitui** documentação de manutenção porque:

| Git / GitHub fornece | Este guia fornece |
|----------------------|-------------------|
| Código-fonte | **Por quê** cada peça existe |
| Commits | Fluxos e decisões de arquitetura |
| README (setup) | Onde alterar comportamento específico |
| Issues/PRs | Contratos de API, schema DB, armadilhas |

**Resumo:** outro dev consegue clonar e rodar pelo README. Para **manter sem quebrar**, precisa deste guia + [MANUAL.md](./MANUAL.md).

---

## 2. Arquitetura

```
┌─────────────┐     webhook POST      ┌──────────────────┐
│  WhatsApp   │ ◄──────────────────► │  Evolution API   │
│  (celular)  │                      │  Docker :1667    │
└─────────────┘                      └────────┬─────────┘
                                              │ POST /webhook
                                              │ (+ x-webhook-secret)
                                              ▼
                                     ┌──────────────────┐
                                     │  Node.js Express │
                                     │  :3000           │
                                     └────────┬─────────┘
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                   ┌────────────┐    ┌────────────┐    ┌────────────┐
                   │  Supabase  │    │   Gemini   │    │  Evolution │
                   │  PostgreSQL│    │  Google AI │    │  sendText  │
                   └────────────┘    └────────────┘    └────────────┘
```

### Responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| `Evolution API` | Sessão WhatsApp, receber/enviar mensagens, disparar webhooks |
| `Express` | Orquestração: validar, contexto, IA, persistência, resposta |
| `Supabase` | Memória (`chat_history`) e métricas (`usage_logs`) |
| `Gemini` | Geração de texto com system instruction + histórico |

---

## 3. Estrutura do repositório

```
whatsapp-gemini-bridge/
├── src/
│   ├── index.js                 # Bootstrap Express, registra rotas
│   ├── config/env.js            # Centraliza process.env + validateEnv()
│   ├── constants/messages.js    # Mensagens fixas (limite diário, fallback)
│   ├── routes/
│   │   ├── webhook.js           # ★ Fluxo principal — POST /webhook
│   │   ├── health.js            # GET /health — checks Evolution + Supabase
│   │   └── stats.js             # GET /stats — agregação usage_logs
│   ├── services/
│   │   ├── gemini.js            # ★ Prompt + chamada Gemini + custo estimado
│   │   ├── evolution.js         # Envio WhatsApp + health Evolution
│   │   └── supabase.js          # CRUD histórico, usage, stats
│   └── utils/
│       ├── message-parser.js    # Parse payload Evolution (remoteJid, texto)
│       ├── dedup.js             # Anti-duplicata + debounce (in-memory)
│       ├── webhook-auth.js      # Middleware x-webhook-secret
│       └── logger.js            # Logs JSON estruturados
├── scripts/setup-webhook.js     # Configura webhook na Evolution via API
├── docker-compose.yml           # Evolution + Postgres + Redis + bridge (opcional)
├── Dockerfile                   # Imagem do Node.js
├── supabase-setup.sql           # Schema completo
├── supabase-migration-v2.sql    # Só usage_logs (upgrade)
├── .env.example                 # Template — nunca commitar .env real
├── MANUAL.md                    # Guia operacional (usuário final)
└── DEVELOPER.md                 # Este arquivo
```

### Arquivos que você mais vai editar

| Objetivo | Arquivo |
|----------|---------|
| Mudar personalidade do bot | `src/services/gemini.js` → `SYSTEM_INSTRUCTION` |
| Mudar fluxo de mensagens | `src/routes/webhook.js` |
| Nova variável de config | `src/config/env.js` + `.env.example` |
| Novo endpoint HTTP | `src/routes/*.js` + registrar em `src/index.js` |
| Mensagens fixas do bot | `src/constants/messages.js` |
| Regras de parse WhatsApp | `src/utils/message-parser.js` |

---

## 4. Fluxo de uma mensagem

Arquivo principal: **`src/routes/webhook.js`**

```
POST /webhook
  │
  ├─ validateWebhookSecret()     → 401 se secret inválido
  ├─ isValidIncomingTextMessage()→ ignora: fromMe, grupo, mídia sem texto
  ├─ isDuplicateMessage()        → ignora message.id repetido
  ├─ isDebounced()               → ignora spam < DEBOUNCE_MS
  ├─ getDailyMessageCount()      → limite MAX_DAILY_MESSAGES
  │
  ├─ getChatHistory()            → últimas N msgs do Supabase
  ├─ generateReply()             → Gemini (com fallback em erro)
  ├─ saveChatMessage()           → persiste user + model
  ├─ sendWhatsAppMessage()       → Evolution sendText
  └─ saveUsageLog()              → tokens + custo (não bloqueia se falhar)
```

### Ordem crítica (não inverter sem motivo)

1. **Enviar WhatsApp antes** de operações não-críticas
2. **Usage log por último** — falha silenciosa (`logger.warn`)
3. **Retornar HTTP 200** em fallbacks — evita retentativas em loop da Evolution

### Payload Evolution (MESSAGES_UPSERT)

Campos usados pelo parser:

```json
{
  "event": "MESSAGES_UPSERT",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "remoteJidAlt": "...",
      "fromMe": false,
      "id": "MESSAGE_ID_UNICO"
    },
    "pushName": "Nome",
    "message": {
      "conversation": "texto simples",
      "extendedTextMessage": { "text": "texto com link" }
    },
    "messageType": "conversation"
  }
}
```

**Atenção:** contatos Business podem vir com `@lid` — `resolveRemoteJid()` usa `remoteJidAlt` nesses casos.

---

## 5. Variáveis de ambiente

Referência completa em `.env.example`. Agrupadas por domínio:

### Servidor

| Variável | Default | Descrição |
|----------|---------|-----------|
| `PORT` | `3000` | Porta Express |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

### Evolution API

| Variável | Descrição |
|----------|-----------|
| `EVOLUTION_API_URL` | `http://localhost:1667` (host) ou `http://evolution-api:8080` (Docker interno) |
| `EVOLUTION_API_KEY` | Chave mestra — também usada no `docker-compose` |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp |
| `EVOLUTION_SERVER_URL` | URL pública da Evolution (para QR/manager) |
| `WEBHOOK_URL` | URL que a Evolution chama — **depende do modo de execução** |
| `WEBHOOK_SECRET` | Header `x-webhook-secret` — vazio desabilita validação |

### Gemini

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GEMINI_API_KEY` | — | Google AI Studio |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo ativo |
| `GEMINI_MAX_OUTPUT_TOKENS` | `512` | Limite de resposta |
| `GEMINI_FALLBACK_MESSAGE` | (ver constants) | Msg quando IA falha |

### Supabase

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_KEY` | Preferir `service_role` em produção |

### Bot / rate limit

| Variável | Default | Descrição |
|----------|---------|-----------|
| `CONTEXT_MESSAGE_LIMIT` | `10` | Msgs de histórico enviadas ao Gemini |
| `DEBOUNCE_MS` | `3000` | Intervalo mínimo entre msgs do mesmo contato |
| `DEDUP_TTL_MS` | `86400000` | TTL do cache de message.id |
| `MAX_DAILY_MESSAGES` | `50` | Limite diário por whatsapp_id |

### PostgreSQL (Evolution Docker)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_USER` | Usuário do container postgres |
| `POSTGRES_PASSWORD` | Senha — **alterar em produção** |
| `POSTGRES_DB` | Nome do banco |

---

## 6. Banco de dados (Supabase)

Scripts: `supabase-setup.sql` (fresh) | `supabase-migration-v2.sql` (upgrade)

### Tabela `chat_history`

| Coluna | Tipo | Uso |
|--------|------|-----|
| `whatsapp_id` | text | `remoteJid` normalizado |
| `role` | text | `user` ou `model` |
| `content` | text | Texto da mensagem |
| `created_at` | timestamptz | Ordenação do contexto |

Índice: `(whatsapp_id, created_at DESC)`

### Tabela `usage_logs`

| Coluna | Tipo | Uso |
|--------|------|-----|
| `input_tokens` | int | Tokens do prompt |
| `output_tokens` | int | Tokens da resposta |
| `estimated_cost_usd` | numeric | Estimativa (hardcoded em `gemini.js`) |

### RLS (Row Level Security)

Políticas permissivas para `anon`/`authenticated` — adequado para MVP com chave publishable.

**Produção:** restringir policies ou usar `service_role` exclusivamente no backend.

### Queries úteis para manutenção

```sql
-- Histórico de um contato
SELECT role, content, created_at FROM chat_history
WHERE whatsapp_id = '5511...@s.whatsapp.net'
ORDER BY created_at DESC LIMIT 20;

-- Custo por contato (últimos 7 dias)
SELECT whatsapp_id, COUNT(*), SUM(estimated_cost_usd)
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY whatsapp_id ORDER BY 3 DESC;

-- Limpar histórico de um contato (GDPR / reset)
DELETE FROM chat_history WHERE whatsapp_id = '5511...@s.whatsapp.net';
DELETE FROM usage_logs WHERE whatsapp_id = '5511...@s.whatsapp.net';
```

---

## 7. Integrações externas

### Evolution API v2.3.7

- Imagem: `evoapicloud/evolution-api:v2.3.7` (não usar `atendai/*`)
- Manager: `http://localhost:1667/manager`
- Enviar texto: `POST /message/sendText/{instance}`
- Webhook: `POST /webhook/set/{instance}` — ver `scripts/setup-webhook.js`

### Google Gemini

- SDK: `@google/generative-ai`
- Uso: `startChat({ history })` + `sendMessage()`
- Metadata: `response.usageMetadata` → `promptTokenCount`, `candidatesTokenCount`
- **Modelos testados:** `gemini-2.5-flash` ✅ | `gemini-2.0-flash` (cota zero em algumas contas)

### Supabase

- SDK: `@supabase/supabase-js`
- Cliente singleton em `src/services/supabase.js`

---

## 8. Modos de execução

### Modo A — Híbrido (atual em dev Windows)

```
Docker:  evolution-api + postgres + redis
Host:    npm run dev (Node na porta 3000)
Webhook: http://host.docker.internal:3000/webhook
```

`.env`:
```env
EVOLUTION_API_URL=http://localhost:1667
WEBHOOK_URL=http://host.docker.internal:3000/webhook
```

### Modo B — Full Docker

```
Docker:  todos os serviços incluindo whatsapp-bridge
Webhook: http://whatsapp-bridge:3000/webhook
```

```powershell
docker compose up -d --build
node scripts/setup-webhook.js
```

`.env` (bridge container):
```env
EVOLUTION_API_URL=http://evolution-api:8080
WEBHOOK_URL=http://whatsapp-bridge:3000/webhook
```

> Sempre rode `setup-webhook.js` após mudar `WEBHOOK_URL` ou `WEBHOOK_SECRET`.

---

## 9. Tarefas comuns de manutenção

### Alterar prompt da IA

**Arquivo:** `src/services/gemini.js` → `SYSTEM_INSTRUCTION`

Reiniciar Node. Não precisa mexer no Supabase.

### Adicionar nova variável de ambiente

1. Adicionar em `src/config/env.js`
2. Documentar em `.env.example`
3. Se sensível, nunca commitar valor real
4. Reiniciar processo

### Adicionar novo endpoint

1. Criar `src/routes/novo.js` com `Router()`
2. Registrar em `src/index.js`: `app.use(novoRouter)`
3. Documentar em README se for público

### Suportar novo tipo de mensagem (ex: áudio)

1. Estender `extractTextMessage()` em `message-parser.js`
2. Ajustar `isValidIncomingTextMessage()` se necessário
3. Considerar transcrição antes do Gemini (feature nova)

### Trocar modelo Gemini

`.env` → `GEMINI_MODEL=...`

Testar com script rápido:
```javascript
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const m = genAI.getGenerativeModel({ model: 'MODELO_AQUI' });
const r = await m.generateContent('diga ok');
console.log(r.response.text());
```

### Recriar instância WhatsApp do zero

1. Deletar instância no manager ou via API
2. Criar nova com mesmo `EVOLUTION_INSTANCE_NAME`
3. Escanear QR Code
4. `node scripts/setup-webhook.js`

### Atualizar Evolution API

1. Alterar tag em `docker-compose.yml`
2. `docker compose pull evolution-api`
3. `docker compose up -d evolution-api`
4. Testar QR Code e webhook

---

## 10. Debug e logs

### Logs estruturados

Logger: `src/utils/logger.js` — saída JSON no stdout.

```powershell
# Dev com mais detalhe
LOG_LEVEL=debug npm run dev
```

| Evento | Significado |
|--------|-------------|
| `webhook_received` | Payload resumido (sem conteúdo completo) |
| `webhook_ignored` | Evento filtrado (grupo, fromMe, etc.) |
| `webhook_unauthorized` | Secret inválido |
| `message_received` | Mensagem válida entrando no pipeline |
| `message_processed` | Sucesso completo |
| `message_processed_fallback` | Gemini falhou, fallback enviado |
| `gemini_fallback_used` | Detalhe do erro Gemini |
| `usage_log_save_failed` | Tabela usage_logs inacessível |
| `daily_limit_reached` | Limite diário atingido |

### Logs Docker (Evolution)

```powershell
docker logs evolution_api --tail 100 -f
```

Erros comuns: `Request failed with status code 500` no webhook → ver logs do Node.

### Endpoints de diagnóstico

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/stats
curl http://localhost:1667
```

### Simular webhook localmente

```powershell
node -e "
const payload = {
  event: 'MESSAGES_UPSERT',
  data: {
    key: { remoteJid: '5511...@s.whatsapp.net', fromMe: false, id: 'test-' + Date.now() },
    message: { conversation: 'teste dev' },
    messageType: 'conversation'
  }
};
fetch('http://localhost:3000/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': process.env.WEBHOOK_SECRET
  },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log);
"
```

> Rodar na pasta do projeto com `.env` carregado, ou exportar `WEBHOOK_SECRET` manualmente.

---

## 11. Segurança

### Checklist

- [ ] `.env` no `.gitignore` — **nunca commitar**
- [ ] `WEBHOOK_SECRET` configurado em produção
- [ ] Trocar `POSTGRES_PASSWORD` default do Docker
- [ ] Usar `service_role` Supabase no backend (não publishable)
- [ ] Revisar RLS policies antes de expor publicamente
- [ ] Rotacionar tokens se expostos (Gemini, Supabase, GitHub, Evolution)

### Superfície de ataque

| Vetor | Mitigação atual |
|-------|-----------------|
| Webhook público | `x-webhook-secret` |
| Spam / custo Gemini | debounce, dedup, limite diário, maxOutputTokens |
| Vazamento de histórico Supabase | RLS (revisar para prod) |

---

## 12. Deploy e checklist

### Pré-deploy

- [ ] `.env` configurado no servidor
- [ ] Tabelas Supabase criadas
- [ ] `docker compose up -d` OK
- [ ] WhatsApp conectado (status `open`)
- [ ] `node scripts/setup-webhook.js` → 201
- [ ] `/health` → `"status":"ok"`
- [ ] Mensagem teste end-to-end

### Pós-deploy

- [ ] Monitorar `/stats` nas primeiras 24h
- [ ] Verificar custo Gemini no Google AI Studio
- [ ] Configurar restart policy (`unless-stopped` já no compose)

### Rollback rápido

```powershell
git checkout main~1 -- src/
npm run dev
# ou
docker compose up -d --build
```

---

## 13. Limitações conhecidas

| Limitação | Impacto | Workaround |
|-----------|---------|------------|
| Dedup/debounce in-memory | Perde estado ao reiniciar Node | Migrar para Redis |
| Só mensagens texto 1:1 | Ignora grupos e mídia | Estender parser |
| Custo Gemini estimado | Valores hardcoded em `gemini.js` | Atualizar tarifas ou usar billing API |
| Node fora do Docker (dev) | Dois modos de WEBHOOK_URL | Documentado na seção 8 |
| `npm run setup:webhook` | Precisa Node no PATH (Windows) | `node scripts/setup-webhook.js` |
| Publishable key Supabase | RLS permissivo | service_role em prod |

---

## 14. Roadmap sugerido

Melhorias que **ainda não estão implementadas**:

- [ ] Redis para dedup persistente entre restarts
- [ ] Suporte a áudio/imagem (transcrição/visão)
- [ ] Painel admin web
- [ ] CI/CD (GitHub Actions: lint + test)
- [ ] Testes automatizados do parser e webhook
- [ ] Fila de mensagens (Bull/BullMQ) para picos
- [ ] Multi-instância WhatsApp

---

## Convenções do projeto

- **ES Modules** (`"type": "module"`) — usar `import/export`
- **Sem framework extra** — Express puro, sem Nest/Fastify
- **Config centralizada** — sempre via `src/config/env.js`
- **Logs JSON** — nunca `console.log` solto em código novo
- **Erros críticos vs não-críticos** — envio WhatsApp é crítico; usage log não é

---

## Contatos e referências

- Repositório: https://github.com/GabFontes7/whatsapp-gemini-bridge
- Evolution API docs: https://doc.evolution-api.com/v2/
- Gemini API: https://ai.google.dev/
- Supabase docs: https://supabase.com/docs

---

*Última atualização: compatível com commit da Fase 3 (webhook secret, fallback, Docker env externalizado).*
