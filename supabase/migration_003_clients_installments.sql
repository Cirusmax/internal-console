-- Rode este script no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- Cria o cadastro de clientes e o controle de parcelamento de contratos:
--   - client_installments fica pendente até ser confirmada como paga
--   - só quando confirmada é que vira uma receita de verdade em "transactions"
--   - até lá não conta no saldo/dashboard, só aparece como "a receber"

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_by uuid references auth.users(id),
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.client_charges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  description text not null,
  category text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  installments_count int not null check (installments_count between 1 and 60),
  first_due_date date not null,
  created_by uuid references auth.users(id),
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.client_installments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.client_charges(id) on delete cascade,
  installment_number int not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null
);

-- ===== Autoria automática (mesmo padrão de recurring_rules) =====

create or replace function public.set_client_authorship()
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

drop trigger if exists trg_clients_authorship on public.clients;
create trigger trg_clients_authorship
  before insert on public.clients
  for each row execute function public.set_client_authorship();

drop trigger if exists trg_client_charges_authorship on public.client_charges;
create trigger trg_client_charges_authorship
  before insert on public.client_charges
  for each row execute function public.set_client_authorship();

-- ===== Confirmar / desfazer pagamento de parcela =====
-- Fazem as duas operações (criar/apagar a receita + atualizar a parcela) numa
-- transação só, pra nunca ficar num estado inconsistente.

create or replace function public.mark_installment_paid(installment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inst public.client_installments;
  charge public.client_charges;
  client public.clients;
  new_tx_id uuid;
begin
  select * into inst from public.client_installments where id = installment_id;
  if inst.id is null then
    raise exception 'Parcela não encontrada';
  end if;
  if inst.paid then
    raise exception 'Parcela já está paga';
  end if;

  select * into charge from public.client_charges where id = inst.charge_id;
  select * into client from public.clients where id = charge.client_id;

  insert into public.transactions (type, amount, category, description, occurred_on)
  values (
    'receita',
    inst.amount,
    charge.category,
    client.name || ' — ' || charge.description || ' (parcela ' || inst.installment_number || '/' || charge.installments_count || ')',
    current_date
  )
  returning id into new_tx_id;

  update public.client_installments
    set paid = true, paid_at = now(), transaction_id = new_tx_id
    where id = installment_id;

  return new_tx_id;
end;
$$;

create or replace function public.unmark_installment_paid(installment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inst public.client_installments;
begin
  select * into inst from public.client_installments where id = installment_id;
  if inst.id is null then
    raise exception 'Parcela não encontrada';
  end if;

  delete from public.transactions where id = inst.transaction_id;

  update public.client_installments
    set paid = false, paid_at = null, transaction_id = null
    where id = installment_id;
end;
$$;

grant execute on function public.mark_installment_paid(uuid) to authenticated;
grant execute on function public.unmark_installment_paid(uuid) to authenticated;

-- ===== RLS compartilhada (mesmo padrão do resto do app) =====

alter table public.clients enable row level security;
alter table public.client_charges enable row level security;
alter table public.client_installments enable row level security;

create policy "Logados veem clientes" on public.clients for select using (auth.role() = 'authenticated');
create policy "Logados criam clientes" on public.clients for insert with check (auth.role() = 'authenticated');
create policy "Logados editam clientes" on public.clients for update using (auth.role() = 'authenticated');
create policy "Logados excluem clientes" on public.clients for delete using (auth.role() = 'authenticated');

create policy "Logados veem cobrancas" on public.client_charges for select using (auth.role() = 'authenticated');
create policy "Logados criam cobrancas" on public.client_charges for insert with check (auth.role() = 'authenticated');
create policy "Logados editam cobrancas" on public.client_charges for update using (auth.role() = 'authenticated');
create policy "Logados excluem cobrancas" on public.client_charges for delete using (auth.role() = 'authenticated');

create policy "Logados veem parcelas" on public.client_installments for select using (auth.role() = 'authenticated');
create policy "Logados criam parcelas" on public.client_installments for insert with check (auth.role() = 'authenticated');
create policy "Logados editam parcelas" on public.client_installments for update using (auth.role() = 'authenticated');
create policy "Logados excluem parcelas" on public.client_installments for delete using (auth.role() = 'authenticated');
