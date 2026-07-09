-- Tabela de histórico de conversas para contexto do bot
create table if not exists public.chat_history (
  id bigint generated always as identity primary key,
  whatsapp_id text not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Índice para busca rápida por usuário e ordenação temporal
create index if not exists idx_chat_history_whatsapp_id_created_at
  on public.chat_history (whatsapp_id, created_at desc);

-- Comentários de documentação
comment on table public.chat_history is 'Histórico de mensagens por contato WhatsApp para contexto do Gemini';
comment on column public.chat_history.whatsapp_id is 'Identificador do contato (remoteJid normalizado)';
comment on column public.chat_history.role is 'Papel da mensagem: user (cliente) ou model (bot)';
comment on column public.chat_history.content is 'Conteúdo textual da mensagem';

-- Permite o backend (chave publishable/anon) ler e gravar histórico
alter table public.chat_history enable row level security;

create policy "chat_history_select_anon"
  on public.chat_history
  for select
  to anon, authenticated
  using (true);

create policy "chat_history_insert_anon"
  on public.chat_history
  for insert
  to anon, authenticated
  with check (true);

-- Registro de uso do Gemini (controle de custos)
create table if not exists public.usage_logs (
  id bigint generated always as identity primary key,
  whatsapp_id text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_logs_created_at
  on public.usage_logs (created_at desc);

create index if not exists idx_usage_logs_whatsapp_id
  on public.usage_logs (whatsapp_id, created_at desc);

comment on table public.usage_logs is 'Registro de consumo de tokens e custo estimado do Gemini por mensagem';

alter table public.usage_logs enable row level security;

create policy "usage_logs_select_anon"
  on public.usage_logs
  for select
  to anon, authenticated
  using (true);

create policy "usage_logs_insert_anon"
  on public.usage_logs
  for insert
  to anon, authenticated
  with check (true);
