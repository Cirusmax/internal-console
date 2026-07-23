-- Rode este script no SQL Editor do Supabase DEPOIS do schema.sql original.
-- Faz 3 coisas:
--   1) Torna os lançamentos compartilhados entre todos os usuários logados (em vez de privados por usuário)
--   2) Cria um log de atividade (quem criou/editou/excluiu, e o que era antes de excluir)
--   3) Cria lançamentos recorrentes (débitos/receitas fixos gerados automaticamente todo mês)

-- ===== 1) Transactions: colunas de autoria e vínculo com recorrência =====

alter table public.transactions
  add column if not exists created_by_email text,
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists updated_by_email text,
  add column if not exists updated_at timestamptz;

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('receita', 'despesa')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text,
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_by_email text,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists recurring_rule_id uuid references public.recurring_rules(id) on delete set null;

-- Autoria automática também pras regras recorrentes
create or replace function public.set_recurring_rule_authorship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  new.created_by_email := auth.jwt() ->> 'email';
  return new;
end;
$$;

drop trigger if exists trg_recurring_rules_authorship on public.recurring_rules;
create trigger trg_recurring_rules_authorship
  before insert on public.recurring_rules
  for each row execute function public.set_recurring_rule_authorship();

-- Evita gerar o lançamento do mesmo mês duas vezes pra uma mesma regra recorrente
create unique index if not exists transactions_recurring_month_unique
  on public.transactions (recurring_rule_id, date_trunc('month', occurred_on))
  where recurring_rule_id is not null;

-- Autoria automática e autêntica (o cliente não escolhe quem é o autor, o banco decide)
create or replace function public.set_transaction_authorship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.created_by_email := auth.jwt() ->> 'email';
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
    new.updated_by_email := auth.jwt() ->> 'email';
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_transactions_authorship on public.transactions;
create trigger trg_transactions_authorship
  before insert or update on public.transactions
  for each row execute function public.set_transaction_authorship();

-- ===== 2) Log de atividade =====

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_id uuid,
  actor_email text,
  occurred_at timestamptz not null default now(),
  type text,
  amount numeric(12, 2),
  category text,
  description text,
  occurred_on date,
  created_by_email text
);

create or replace function public.log_transaction_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_ref record;
  log_action text;
begin
  if tg_op = 'INSERT' then
    row_ref := new;
    log_action := 'created';
  elsif tg_op = 'UPDATE' then
    row_ref := new;
    log_action := 'updated';
  else
    row_ref := old;
    log_action := 'deleted';
  end if;

  insert into public.activity_log (
    transaction_id, action, actor_id, actor_email,
    type, amount, category, description, occurred_on, created_by_email
  ) values (
    row_ref.id, log_action, auth.uid(), auth.jwt() ->> 'email',
    row_ref.type, row_ref.amount, row_ref.category, row_ref.description,
    row_ref.occurred_on, row_ref.created_by_email
  );

  return row_ref;
end;
$$;

drop trigger if exists trg_transactions_activity_log on public.transactions;
create trigger trg_transactions_activity_log
  after insert or update or delete on public.transactions
  for each row execute function public.log_transaction_activity();

-- ===== 3) RLS: de "cada um vê o seu" pra "compartilhado entre logados" =====

drop policy if exists "Usuários veem apenas seus lançamentos" on public.transactions;
drop policy if exists "Usuários criam seus lançamentos" on public.transactions;
drop policy if exists "Usuários editam seus lançamentos" on public.transactions;
drop policy if exists "Usuários excluem seus lançamentos" on public.transactions;

create policy "Logados veem todos os lançamentos"
  on public.transactions for select
  using (auth.role() = 'authenticated');

create policy "Logados criam lançamentos como si mesmos"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Logados editam qualquer lançamento"
  on public.transactions for update
  using (auth.role() = 'authenticated');

create policy "Logados excluem qualquer lançamento"
  on public.transactions for delete
  using (auth.role() = 'authenticated');

alter table public.activity_log enable row level security;

create policy "Logados leem o log de atividade"
  on public.activity_log for select
  using (auth.role() = 'authenticated');
-- Sem policy de insert/update/delete pro client: só a trigger (security definer) escreve aqui.

alter table public.recurring_rules enable row level security;

create policy "Logados veem regras recorrentes"
  on public.recurring_rules for select
  using (auth.role() = 'authenticated');

create policy "Logados criam regras recorrentes"
  on public.recurring_rules for insert
  with check (auth.role() = 'authenticated');

create policy "Logados editam regras recorrentes"
  on public.recurring_rules for update
  using (auth.role() = 'authenticated');

create policy "Logados excluem regras recorrentes"
  on public.recurring_rules for delete
  using (auth.role() = 'authenticated');
