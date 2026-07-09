# Manual de Uso — WhatsApp Gemini Bridge

Guia prático para ligar, desligar, conectar e operar o chatbot no dia a dia.

---

## Índice

1. [O que é este sistema](#1-o-que-é-este-sistema)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Primeira instalação (só uma vez)](#3-primeira-instalação-só-uma-vez)
4. [Ligar o chatbot (uso diário)](#4-ligar-o-chatbot-uso-diário)
5. [Desligar o chatbot](#5-desligar-o-chatbot)
6. [Conectar o WhatsApp (QR Code)](#6-conectar-o-whatsapp-qr-code)
7. [Desconectar o WhatsApp](#7-desconectar-o-whatsapp)
8. [Reconectar o WhatsApp](#8-reconectar-o-whatsapp)
9. [Verificar se está tudo funcionando](#9-verificar-se-está-tudo-funcionando)
10. [Monitoramento e estatísticas](#10-monitoramento-e-estatísticas)
11. [Personalizar o bot](#11-personalizar-o-bot)
12. [Problemas comuns e soluções](#12-problemas-comuns-e-soluções)
13. [Referência rápida de comandos](#13-referência-rápida-de-comandos)

---

## 1. O que é este sistema

O chatbot funciona com **4 peças** trabalhando juntas:

| Peça | Função | Onde roda |
|------|--------|-----------|
| **Evolution API** | Conecta ao WhatsApp | Docker (porta 1667) |
| **Node.js (Express)** | Recebe mensagens, chama a IA, responde | Seu PC (porta 3000) |
| **Gemini (Google AI)** | Gera as respostas | Nuvem (Google) |
| **Supabase** | Guarda histórico e custos | Nuvem (Supabase) |

**Fluxo de uma mensagem:**

```
Alguém manda WhatsApp
    → Evolution API detecta
    → Node.js recebe via webhook
    → Supabase busca histórico
    → Gemini gera resposta
    → Node.js salva e envia de volta
    → WhatsApp entrega ao contato
```

---

## 2. Pré-requisitos

Antes de usar, você precisa ter instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — rodando
- [Node.js](https://nodejs.org/) 18 ou superior
- Conta no [Google AI Studio](https://aistudio.google.com/) (chave Gemini)
- Projeto no [Supabase](https://supabase.com/) (URL + chave)
- Arquivo `.env` configurado na pasta do projeto

> **Pasta do projeto:** `C:\Users\gfont\Projects\whatsapp-gemini-bridge`

---

## 3. Primeira instalação (só uma vez)

Execute estes passos **apenas na primeira vez** ou ao clonar o projeto em outro PC.

### 3.1 Baixar o projeto

```powershell
git clone https://github.com/GabFontes7/whatsapp-gemini-bridge.git
cd whatsapp-gemini-bridge
```

### 3.2 Instalar dependências Node

```powershell
npm install
```

### 3.3 Configurar variáveis de ambiente

```powershell
copy .env.example .env
```

Abra o `.env` e preencha com suas credenciais reais:

- `GEMINI_API_KEY` — chave do Google AI Studio
- `SUPABASE_URL` e `SUPABASE_KEY` — dados do Supabase
- `EVOLUTION_API_KEY` — chave mestra da Evolution (padrão: `suachavemestra123`)
- `EVOLUTION_INSTANCE_NAME` — nome da instância (ex: `minha-instancia`)
- `WEBHOOK_SECRET` — um texto secreto qualquer (ex: `meu_secret_123`)

### 3.4 Criar tabelas no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Abra **SQL Editor** → **New query**
3. Cole todo o conteúdo do arquivo `supabase-setup.sql`
4. Clique em **Run**

### 3.5 Subir a Evolution API (Docker)

```powershell
docker compose up -d evolution-api postgres redis
```

Aguarde ~30 segundos para os containers iniciarem.

### 3.6 Criar instância WhatsApp (só na primeira vez)

Acesse no navegador: **http://localhost:1667/manager**

- Crie uma instância com o nome definido em `EVOLUTION_INSTANCE_NAME`
- Escaneie o QR Code (veja seção 6)

### 3.7 Configurar webhook

```powershell
node scripts/setup-webhook.js
```

Deve retornar `Status: 201` — significa que a Evolution sabe para onde enviar as mensagens.

---

## 4. Ligar o chatbot (uso diário)

Siga **nesta ordem** toda vez que for usar o bot:

### Passo 1 — Ligar o Docker (Evolution API)

Abra o **Docker Desktop** e aguarde ficar verde (Running).

Depois, no terminal:

```powershell
cd C:\Users\gfont\Projects\whatsapp-gemini-bridge
docker compose up -d evolution-api postgres redis
```

**Verificar se subiu:**

```powershell
docker ps
```

Você deve ver 3 containers: `evolution_api`, `evolution_postgres`, `evolution_redis`.

### Passo 2 — Ligar o Node.js (cérebro do bot)

```powershell
cd C:\Users\gfont\Projects\whatsapp-gemini-bridge
npm run dev
```

**Deve aparecer algo como:**

```
{"level":"info","event":"server_started","port":3000,...}
```

> Deixe este terminal **aberto** enquanto o bot estiver ativo.

### Passo 3 — Confirmar WhatsApp conectado

Acesse: **http://localhost:1667/manager**

O status da instância deve estar **"open"** (conectado). Se estiver "connecting" ou desconectado, veja a [seção 6](#6-conectar-o-whatsapp-qr-code) ou [8](#8-reconectar-o-whatsapp).

### Passo 4 — Teste rápido

Envie uma mensagem de outro celular para o número conectado. O bot deve responder em alguns segundos.

---

## 5. Desligar o chatbot

### Desligar só o Node.js (bot para de responder)

No terminal onde o `npm run dev` está rodando, pressione:

```
Ctrl + C
```

O WhatsApp continua conectado, mas **ninguém recebe resposta automática**.

### Desligar a Evolution API (WhatsApp + infra)

```powershell
cd C:\Users\gfont\Projects\whatsapp-gemini-bridge
docker compose down
```

Isso para Evolution, PostgreSQL e Redis. O WhatsApp **desconecta**.

### Desligar tudo (modo completo)

1. `Ctrl + C` no terminal do Node.js
2. `docker compose down` no terminal do Docker
3. (Opcional) Feche o Docker Desktop

---

## 6. Conectar o WhatsApp (QR Code)

Use quando for a **primeira conexão** ou quando a instância estiver desconectada.

### Passo a passo

1. Certifique-se de que o Docker está rodando:
   ```powershell
   docker compose up -d evolution-api postgres redis
   ```

2. Abra o painel: **http://localhost:1667/manager**

3. Selecione sua instância (`minha-instancia`)

4. Clique em **Connect** / **Conectar** (ou similar)

5. Um **QR Code** aparecerá na tela

6. No celular:
   - Abra o **WhatsApp**
   - Vá em **Aparelhos conectados** (ou **Dispositivos vinculados**)
   - Toque em **Conectar aparelho**
   - Escaneie o QR Code

7. Aguarde o status mudar para **"open"** ✅

> **Dica:** O QR Code expira em ~40 segundos. Se expirar, gere um novo clicando em conectar novamente.

---

## 7. Desconectar o WhatsApp

### Pelo painel (recomendado)

1. Acesse **http://localhost:1667/manager**
2. Selecione a instância
3. Clique em **Logout** / **Desconectar**

### Pelo celular

- WhatsApp → **Aparelhos conectados** → selecione o dispositivo → **Desconectar**

### Parando o Docker

```powershell
docker compose down
```

Também desconecta o WhatsApp, pois a Evolution para de rodar.

---

## 8. Reconectar o WhatsApp

Se o bot parou de receber mensagens ou o status não está "open":

1. Ligue o Docker:
   ```powershell
   docker compose up -d evolution-api postgres redis
   ```

2. Ligue o Node.js:
   ```powershell
   npm run dev
   ```

3. Abra **http://localhost:1667/manager**

4. Se estiver desconectado, escaneie o **QR Code** novamente (seção 6)

5. Reconfigure o webhook (caso tenha recriado a instância):
   ```powershell
   node scripts/setup-webhook.js
   ```

6. Teste enviando uma mensagem

---

## 9. Verificar se está tudo funcionando

### Health check (status geral)

Abra no navegador ou terminal:

```
http://localhost:3000/health
```

**Resposta ideal:**

```json
{
  "status": "ok",
  "checks": {
    "evolution": "up",
    "supabase": "up"
  }
}
```

Se `"status": "degraded"`, alguma peça está fora do ar.

### Evolution API

```
http://localhost:1667
```

Deve retornar `"Welcome to the Evolution API, it is working!"`.

### WhatsApp conectado

Painel: **http://localhost:1667/manager** → status **"open"**

### Teste real

Envie uma mensagem de texto de outro celular. Resposta em ~3–10 segundos = tudo OK.

---

## 10. Monitoramento e estatísticas

### Ver consumo do dia

```
http://localhost:3000/stats
```

Mostra:
- Quantas mensagens foram processadas hoje
- Tokens usados (entrada + saída)
- Custo estimado em USD
- Contatos que mais conversaram

### Ver histórico no Supabase

No SQL Editor do Supabase:

```sql
-- Últimas conversas
SELECT whatsapp_id, role, content, created_at
FROM chat_history
ORDER BY created_at DESC
LIMIT 20;

-- Custo do dia
SELECT
  COUNT(*) AS mensagens,
  SUM(estimated_cost_usd) AS custo_usd
FROM usage_logs
WHERE created_at >= CURRENT_DATE;
```

### Logs do Node.js

Com `npm run dev`, os logs aparecem no terminal em JSON:

| Evento | Significado |
|--------|-------------|
| `message_received` | Mensagem chegou |
| `message_processed` | Bot respondeu com sucesso |
| `message_processed_fallback` | Gemini falhou, enviou mensagem padrão |
| `daily_limit_reached` | Contato atingiu limite diário |
| `webhook_unauthorized` | Tentativa de acesso sem secret |

---

## 11. Personalizar o bot

### Mudar personalidade / tom da conversa

Edite o arquivo: **`src/services/gemini.js`**

Procure por `SYSTEM_INSTRUCTION` e altere o texto.

Depois, reinicie o Node.js (`Ctrl+C` → `npm run dev`).

### Mudar limite diário de mensagens

No `.env`:

```env
MAX_DAILY_MESSAGES=50
```

Reinicie o Node.js.

### Mudar mensagem quando a IA falhar

No `.env`:

```env
GEMINI_FALLBACK_MESSAGE=Sua mensagem personalizada aqui
```

### Mudar modelo da IA

No `.env`:

```env
GEMINI_MODEL=gemini-2.5-flash
```

---

## 12. Problemas comuns e soluções

### Bot não responde

| Verificação | Comando / Ação |
|-------------|----------------|
| Node.js rodando? | Terminal com `npm run dev` aberto |
| Docker rodando? | `docker ps` — 3 containers ativos |
| WhatsApp conectado? | http://localhost:1667/manager → status "open" |
| Health OK? | http://localhost:3000/health → `"status":"ok"` |

### Evolution retorna erro 500 no webhook

- Reinicie o Node.js
- Verifique se as tabelas existem no Supabase (`chat_history` e `usage_logs`)
- Rode novamente: `node scripts/setup-webhook.js`

### QR Code não aparece

- Atualize a página do manager
- Reinicie a Evolution: `docker compose restart evolution-api`
- Use a imagem correta (`evoapicloud/evolution-api:v2.3.7`)

### Gemini sem cota / erro 429

- O bot envia mensagem de fallback automaticamente
- Verifique sua cota em https://aistudio.google.com/
- Confirme que `GEMINI_MODEL=gemini-2.5-flash` no `.env`

### Mensagem "conversamos bastante hoje"

- O contato atingiu `MAX_DAILY_MESSAGES` (padrão: 50/dia)
- Aguarde até meia-noite ou aumente o limite no `.env`

### Porta 3000 já em uso

```powershell
netstat -ano | findstr ":3000"
```

Encerre o processo antigo ou mude `PORT=3001` no `.env`.

---

## 13. Referência rápida de comandos

### Ligar tudo

```powershell
cd C:\Users\gfont\Projects\whatsapp-gemini-bridge
docker compose up -d evolution-api postgres redis
npm run dev
```

### Desligar tudo

```powershell
# Ctrl+C no terminal do Node.js
docker compose down
```

### Reconfigurar webhook

```powershell
node scripts/setup-webhook.js
```

### Ver containers Docker

```powershell
docker ps
```

### Ver logs da Evolution

```powershell
docker logs evolution_api --tail 50
```

### Reiniciar só a Evolution

```powershell
docker compose restart evolution-api
```

### URLs importantes

| URL | O que é |
|-----|---------|
| http://localhost:1667/manager | Painel WhatsApp (QR Code) |
| http://localhost:3000/health | Status do bot |
| http://localhost:3000/stats | Estatísticas do dia |
| https://supabase.com/dashboard | Histórico e custos |

---

## Modo Docker completo (opcional)

Se preferir rodar **tudo** dentro do Docker (sem `npm run dev` separado):

```powershell
docker compose up -d --build
node scripts/setup-webhook.js
```

Neste modo, altere no `.env`:

```env
WEBHOOK_URL=http://whatsapp-bridge:3000/webhook
```

E rode `node scripts/setup-webhook.js` após subir os containers.

---

## Checklist diário

```
[ ] Docker Desktop aberto e rodando
[ ] docker compose up -d evolution-api postgres redis
[ ] npm run dev (terminal aberto)
[ ] WhatsApp status "open" no manager
[ ] Teste: enviar mensagem e receber resposta
```

---

**Repositório:** https://github.com/GabFontes7/whatsapp-gemini-bridge
