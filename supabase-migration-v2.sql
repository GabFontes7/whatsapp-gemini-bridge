-- Execute este script se você já rodou o supabase-setup.sql anteriormente
-- Adiciona apenas a tabela de controle de custos (usage_logs)

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
