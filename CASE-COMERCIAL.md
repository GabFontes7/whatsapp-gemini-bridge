# Case Comercial — Assistente Inteligente no WhatsApp

Material de apresentação para vender o serviço de chatbot com IA generativa.

---

## Elevator pitch (30 segundos)

> **Seu WhatsApp atende sozinho — 24 horas, com memória e tom humano.**
>
> Implementamos um assistente inteligente que responde clientes em segundos, lembra de cada conversa e custa uma fração de um atendente. Você foca no que importa; o bot cuida do repetitivo.

---

## O problema que resolvemos

### Dor do cliente final (empresa contratante)

| Dor | Impacto |
|-----|---------|
| Demora no WhatsApp | Lead esfria, venda perdida |
| Atendente repetindo FAQ | Custo alto, equipe esgotada |
| Fora do horário comercial | 60%+ das mensagens sem resposta |
| Chatbot de menu | Cliente desiste, experiência ruim |
| Custo fixo por headcount | Escala = contratar mais gente |

### Por que chatbots antigos falham

- Não entendem contexto ("e quanto fica?" sem saber do que se trata)
- Árvore de decisão rígida
- Tom robótico — cliente percebe na hora
- Zero memória entre mensagens

---

## Nossa solução

**Assistente de WhatsApp com IA generativa (Google Gemini)** conectado via Evolution API, com memória persistente no Supabase.

### O que o cliente percebe

- Resposta em **3 a 10 segundos**
- Conversa **natural**, no tom da marca
- Bot **lembra** do que foi dito antes
- Disponível **24/7**

### O que acontece nos bastidores

```
WhatsApp → Evolution API → Backend Node.js → Supabase (memória) + Gemini (IA) → Resposta
```

---

## Diferenciais para destacar na venda

| # | Diferencial | Argumento de venda |
|---|-------------|-------------------|
| 1 | **Memória de conversa** | "Não repete pergunta que o cliente já respondeu" |
| 2 | **Tom personalizável** | "Fala como sua marca — formal, casual ou técnico" |
| 3 | **Controle de custos** | "Você vê quanto gasta por dia e por contato" |
| 4 | **Proteção anti-abuso** | "Limite diário evita spam e estouro de budget" |
| 5 | **Fallback automático** | "Se a IA falhar, o cliente recebe resposta — nunca fica no vácuo" |
| 6 | **Código proprietário** | "Sem lock-in de plataforma SaaS cara" |
| 7 | **Webhook seguro** | "Acesso protegido por secret — não é endpoint aberto" |

---

## Casos de uso por segmento

### E-commerce / varejo
- Horário de funcionamento, prazo de entrega, trocas
- Status de pedido (com integração futura)
- Qualificação antes de passar para vendedor

### Clínicas / saúde
- Agendamento e confirmação
- Orientações de preparo para exames
- Lembretes automáticos

### Imobiliárias
- Qualificação de lead (quartos, região, budget)
- Informações sobre imóveis
- Agendamento de visitas

### Prestadores de serviço
- Captura de demanda ("preciso de orçamento para...")
- FAQ de serviços e prazos
- Encaminhamento para consultor

### Infoprodutos / educação
- Suporte a alunos
- Onboarding automatizado
- Respostas sobre acesso, certificado, comunidade

---

## Comparativo: humano vs IA vs menu

| Critério | Atendente humano | Chatbot menu | **Nossa solução** |
|----------|------------------|--------------|-------------------|
| Custo mensal (est.) | R$ 2.500–4.500 | R$ 200–800 | **R$ 180–500*** |
| Disponibilidade | 8h/dia | 24/7 | **24/7** |
| Tempo de resposta | Minutos | Instantâneo | **3–10 seg** |
| Contexto / memória | Alta | Nenhuma | **Alta** |
| Naturalidade | Alta | Baixa | **Alta** |
| Escala | Linear (contratar) | Ilimitada | **Ilimitada** |
| Setup | Semanas | Dias | **Dias** |

*\*Estimativa infra + API Gemini para ~1.000 msgs/mês. Não inclui fee de gestão.*

---

## ROI — argumento financeiro

### Cenário: loja com 800 conversas/mês no WhatsApp

| Item | Valor estimado |
|------|----------------|
| Atendente meio período | ~R$ 2.800/mês |
| Encargos + benefícios | +30–40% |
| **Custo humano total** | **~R$ 3.800/mês** |
| | |
| Infra (Docker + Supabase free tier) | ~R$ 0–80/mês |
| Gemini (~800 msgs, ~400 tokens/msg) | ~R$ 15–40/mês |
| Gestão / manutenção (fee) | R$ 497–997/mês |
| **Custo solução total** | **~R$ 550–1.100/mês** |

**Economia potencial:** 60–80% vs headcount dedicado, com cobertura 24/7.

### Quando NÃO vender

- Volume muito baixo (< 50 msgs/mês) — ROI não justifica
- Necessidade de negociação complexa 100% humana
- Regulamentação que exige atendente certificado em 100% dos casos

---

## Planos sugeridos (precificação B2B)

### Setup inicial (one-time)

| Pacote | Escopo | Preço sugerido |
|--------|--------|----------------|
| Básico | Instalação + prompt padrão + 1 número | R$ 1.500 |
| Completo | Prompt customizado + treinamento + integração webhook | R$ 2.500 |
| Premium | Tudo acima + integração CRM/API externa | R$ 4.000+ |

### Recorrência mensal

| Plano | Incluso | Preço sugerido |
|-------|---------|----------------|
| **Starter** | 1 número, 500 msgs, suporte email | R$ 497/mês |
| **Pro** | 1 número, 3.000 msgs, ajustes de prompt, SLA 24h | R$ 997/mês |
| **Enterprise** | Multi-número, volume ilimitado, integrações | Sob consulta |

---

## Roteiro de apresentação (15 min)

| Tempo | Slide / momento | O que fazer |
|-------|-----------------|-------------|
| 0–2 min | Problema | Perguntar: "Quantas msgs ficam sem resposta por dia?" |
| 2–5 min | Demo ao vivo | Mandar WhatsApp real, mostrar resposta natural |
| 5–8 min | Diferenciais | Memória, custo, 24/7, fallback |
| 8–11 min | ROI | Tabela humano vs bot |
| 11–13 min | Planos | Starter / Pro / Enterprise |
| 13–15 min | Fechamento | "Setup em X dias. Posso reservar a agenda?" |

---

## Objeções comuns e respostas

### "O cliente vai perceber que é robô?"

O prompt é calibrado para tom natural e conversacional. Não se apresenta como IA. Teste ao vivo na demo.

### "E se a IA falar besteira?"

Temos fallback, limite de tokens, limite diário e prompt com regras claras (ex: não decide compras pelo cliente). Histórico auditável no Supabase.

### "Quanto custa por mensagem?"

Aproximadamente R$ 0,0003–0,001 por mensagem na API Gemini (modelo flash). Painel `/stats` mostra custo real.

### "Funciona com meu WhatsApp Business?"

Sim, via Evolution API — conecta com QR Code como WhatsApp Web.

### "E se o WhatsApp bloquear?"

Usamos API não-oficial (Baileys). Recomendamos número dedicado, não o pessoal. Volume moderado + comportamento humano reduz risco.

### "Posso integrar com meu CRM?"

Sim — arquitetura aberta em Node.js. Fase 2+ inclui webhooks de saída e APIs customizadas (upsell).

---

## Entregáveis do serviço

- [ ] Instalação completa (Docker + Node + Supabase)
- [ ] Conexão WhatsApp + webhook configurado
- [ ] Prompt personalizado para o negócio
- [ ] Documentação operacional ([MANUAL.md](./MANUAL.md))
- [ ] Treinamento de 1h para equipe
- [ ] 30 dias de suporte pós-implantação
- [ ] Painel de estatísticas (`/stats`)

---

## Prova social (preencher com seus cases)

| Cliente | Segmento | Resultado |
|---------|----------|-----------|
| _[Nome]_ | _[Segmento]_ | _[Ex: -40% tempo de resposta]_ |
| _[Nome]_ | _[Segmento]_ | _[Ex: 200 leads qualificados/mês]_ |

---

---

## Stack (credibilidade técnica)

| Tecnologia | Papel |
|------------|-------|
| Evolution API v2.3 | Ponte WhatsApp |
| Google Gemini 2.5 Flash | IA generativa |
| Supabase | Memória + métricas |
| Node.js + Express | Backend |
| Docker | Infraestrutura |

Repositório open source: https://github.com/GabFontes7/whatsapp-gemini-bridge

---

---

## Materiais complementares

| Documento | Uso |
|-----------|-----|
| [MANUAL.md](./MANUAL.md) | Operação pós-venda |
| [DEVELOPER.md](./DEVELOPER.md) | Manutenção técnica |
| [README.md](./README.md) | Visão geral do produto |
| Canvas de apresentação | Demo visual ao lado do chat |

---

*Documento preparado para apresentações comerciais. Ajuste preços e cases conforme seu mercado.*
