-- Rode este script no SQL Editor do seu projeto Supabase (supabase.com > seu projeto > SQL Editor > New query)

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  type text not null check (type in ('receita', 'despesa')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Usuários veem apenas seus lançamentos"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Usuários criam seus lançamentos"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Usuários editam seus lançamentos"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Usuários excluem seus lançamentos"
  on public.transactions for delete
  using (auth.uid() = user_id);

create index if not exists transactions_user_month_idx
  on public.transactions (user_id, occurred_on desc);
