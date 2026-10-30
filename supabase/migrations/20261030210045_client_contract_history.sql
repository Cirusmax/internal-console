-- Apenas resumos dos termos; nenhum PDF, Word ou texto integral do contrato.
create table public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  generation_key text not null check (generation_key ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind in ('civil','labor')),
  service text not null check (length(btrim(service)) between 1 and 10000),
  terms text not null check (length(btrim(terms)) between 1 and 20000),
  contract_date date not null,
  city text not null check (length(btrim(city)) between 1 and 500),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  unique (client_id, generation_key)
);
create index client_contracts_created_by_idx on public.client_contracts(created_by);
alter table public.client_contracts enable row level security;
-- O histórico acompanha o acesso compartilhado já existente aos clientes do escritório.
create policy "Office can read client contract history" on public.client_contracts
  for select to authenticated using (
    (select auth.uid()) is not null
    and exists (select 1 from public.clients c where c.id = client_id)
  );
create policy "Office can record generated contracts" on public.client_contracts
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id)
  );
revoke all on public.client_contracts from public, anon, authenticated;
grant select, insert on public.client_contracts to authenticated;
notify pgrst, 'reload schema';
