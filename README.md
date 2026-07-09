# WhatsApp ↔ Gemini Bridge

Backend intermediador que conecta **Evolution API** (WhatsApp) ao **Google Gemini**, usando **Supabase** como memória de contexto das conversas.

## Arquitetura

```
WhatsApp → Evolution API (Docker)
              ↓ webhook
         Node.js / Express
              ↓           ↓
         Supabase      Gemini AI
         (histórico)   (respostas)
              ↓
         Evolution → WhatsApp
```

## Funcionalidades

- Respostas automáticas via Gemini com histórico de contexto
- Memória por contato no Supabase (`chat_history`)
- Controle de custos por mensagem (`usage_logs`)
- Limite diário por contato
- Anti-duplicata e debounce
- Webhook protegido com secret
- Fallback quando a IA falha
- Endpoint de estatísticas (`GET /stats`)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Conta no [Google AI Studio](https://aistudio.google.com/) (Gemini)
- Projeto no [Supabase](https://supabase.com/)

## Configuração rápida

### 1. Clone e instale dependências

```bash
git clone https://github.com/SEU_USUARIO/whatsapp-gemini-bridge.git
cd whatsapp-gemini-bridge
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com suas credenciais reais.

### 3. Crie as tabelas no Supabase

Execute no SQL Editor do Supabase:

- `supabase-setup.sql` (instalação completa)
- ou `supabase-migration-v2.sql` (se já tiver a tabela `chat_history`)

### 4. Suba a Evolution API

```bash
docker compose up -d evolution-api postgres redis
```

### 5. Crie a instância WhatsApp e configure o webhook

Acesse `http://localhost:1667/manager`, escaneie o QR Code e depois:

```bash
node scripts/setup-webhook.js
```

### 6. Inicie o backend

```bash
npm run dev
```

## Modo Docker completo

Para subir Evolution + backend juntos:

```bash
docker compose up -d --build
node scripts/setup-webhook.js
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do serviço e dependências |
| GET | `/stats` | Estatísticas de uso do dia |
| POST | `/webhook` | Recebe mensagens da Evolution API |

## Variáveis de ambiente

Veja `.env.example` para a lista completa.

Principais:

| Variável | Descrição |
|----------|-----------|
| `EVOLUTION_API_KEY` | Chave mestra da Evolution API |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância WhatsApp |
| `GEMINI_API_KEY` | Chave do Google AI Studio |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Chave do Supabase |
| `WEBHOOK_SECRET` | Secret compartilhado com a Evolution |
| `MAX_DAILY_MESSAGES` | Limite diário por contato (padrão: 50) |

## Personalizar o bot

O prompt da IA está em `src/services/gemini.js` (`SYSTEM_INSTRUCTION`).

## Manual de uso

Consulte **[MANUAL.md](./MANUAL.md)** para instruções completas de:
- Como ligar e desligar o chatbot
- Conectar e desconectar o WhatsApp
- Reconectar após queda
- Solução de problemas comuns

## Guia do desenvolvedor

Consulte **[DEVELOPER.md](./DEVELOPER.md)** para manutenção técnica:
- Arquitetura e fluxo de mensagens
- Onde alterar cada comportamento
- Debug, segurança e deploy
- Schema do banco e integrações

## Case comercial

Consulte **[CASE-COMERCIAL.md](./CASE-COMERCIAL.md)** para apresentação e venda do serviço:
- Pitch, ROI e comparativo de custos
- Casos de uso por segmento
- Planos sugeridos e roteiro de demo
- Objeções comuns e script de fechamento

## Scripts

```bash
npm start           # Inicia em produção
npm run dev         # Inicia com hot-reload
npm run setup:webhook  # Configura webhook na Evolution
```

## Estrutura do projeto

```
src/
  config/       # Variáveis de ambiente
  constants/    # Mensagens fixas
  routes/       # Rotas Express
  services/     # Gemini, Evolution, Supabase
  utils/        # Logger, parser, dedup, auth
scripts/        # Setup do webhook
```

## Segurança

- **Nunca** commite o arquivo `.env`
- Use `WEBHOOK_SECRET` em produção
- Prefira a `service_role` key do Supabase no backend (não a publishable)

## Licença

MIT
