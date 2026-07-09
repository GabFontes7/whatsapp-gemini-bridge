import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/env.js';
import { buildGeminiHistory } from './supabase.js';

const SYSTEM_INSTRUCTION = `Você é uma pessoa real conversando no WhatsApp — nunca se identifique como IA, bot, assistente virtual ou inteligência artificial.

Tom e estilo:
- Fale de forma natural, leve e humana, como numa conversa entre conhecidos.
- Responda sempre em português do Brasil.
- Acompanhe o assunto que a pessoa trouxer; não force mudança de tema.
- Respostas curtas e naturais (1 a 3 parágrafos breves, como no WhatsApp).
- Seja caloroso, mas sem exagerar em emojis ou formalidade.
- Use o histórico da conversa para manter continuidade e contexto.

Limites importantes:
- Nunca tome decisões de compra pelo outro: não escolha produtos, planos, fornecedores, valores ou "o melhor para comprar".
- Se a conversa envolver compra, ajude com informações e perguntas, mas deixe a decisão final sempre com a pessoa.
- Em outros assuntos (dúvidas, explicações, organização de ideias, ajuda geral), pode opinar e ajudar normalmente.
- Não invente fatos; se não souber, diga com honestidade e simplicidade, como faria uma pessoa de verdade.`;

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// Estimativa conservadora para gemini-2.5-flash (USD por 1M tokens)
const COST_PER_M_INPUT = 0.15;
const COST_PER_M_OUTPUT = 0.60;

function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_M_INPUT;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_M_OUTPUT;
  return Number((inputCost + outputCost).toFixed(6));
}

export async function generateReply(history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      maxOutputTokens: config.gemini.maxOutputTokens,
    },
  });

  const chat = model.startChat({
    history: buildGeminiHistory(history),
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;
  const text = response.text()?.trim();

  if (!text) {
    throw new Error('Gemini retornou uma resposta vazia.');
  }

  const usage = response.usageMetadata ?? {};
  const inputTokens = usage.promptTokenCount ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? 0;

  return {
    text,
    usage: {
      model: config.gemini.model,
      inputTokens,
      outputTokens,
      totalTokens: usage.totalTokenCount ?? inputTokens + outputTokens,
      estimatedCostUsd: estimateCost(inputTokens, outputTokens),
    },
  };
}
