alter table public.clients
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text;

alter table public.client_charges add column if not exists contract_key text;
create unique index if not exists client_charges_contract_key_unique
  on public.client_charges(contract_key) where contract_key is not null;

-- Uma chamada cria a cobrança e todas as parcelas na mesma transação.
-- A chave estável permite repetir uma emissão sem duplicar a dívida.
create or replace function public.create_contract_charge(
  p_client_id uuid, p_contract_key text, p_description text,
  p_total_amount numeric, p_installments jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_regular int; v_down int; v_total numeric; v_first date;
  v_normalized jsonb; v_existing_rows jsonb; v_id uuid;
  v_existing public.client_charges%rowtype;
begin
  if auth.uid() is null then raise exception 'É necessário entrar no sistema.'; end if;
  if p_contract_key is null or p_contract_key !~ '^[a-f0-9]{64}$'
    or p_description is null or btrim(p_description) = '' then
    raise exception 'Dados do contrato inválidos.';
  end if;
  if p_total_amount is null or p_total_amount <= 0 or p_total_amount > 9999999999.99
    or round(p_total_amount, 2) <> p_total_amount then raise exception 'Valor do contrato inválido.'; end if;
  if p_installments is null or jsonb_typeof(p_installments) <> 'array' then raise exception 'Parcelas inválidas.'; end if;
  if jsonb_array_length(p_installments) not between 1 and 61 then raise exception 'Número de parcelas inválido.'; end if;
  if exists (select 1 from jsonb_to_recordset(p_installments) as r(installment_number int, amount numeric, due_date date, is_down_payment boolean)
    where r.installment_number is null or r.amount is null or r.due_date is null or r.is_down_payment is null
      or r.amount <= 0 or r.amount > 9999999999.99 or round(r.amount,2) <> r.amount
      or (r.is_down_payment and r.installment_number <> 0)
      or (not r.is_down_payment and r.installment_number < 1)) then raise exception 'Confira os valores e vencimentos das parcelas.'; end if;
  select count(*) filter (where not r.is_down_payment), count(*) filter (where r.is_down_payment), sum(r.amount),
    min(r.due_date) filter (where r.installment_number = 1),
    jsonb_agg(jsonb_build_object('installment_number',r.installment_number,'amount',r.amount,'due_date',r.due_date,'is_down_payment',r.is_down_payment) order by r.installment_number)
    into v_regular,v_down,v_total,v_first,v_normalized
    from jsonb_to_recordset(p_installments) as r(installment_number int, amount numeric, due_date date, is_down_payment boolean);
  if v_regular not between 1 and 60 or v_down > 1 or v_total <> p_total_amount
    or (select count(distinct r.installment_number) from jsonb_to_recordset(p_installments) as r(installment_number int)) <> v_regular + v_down
    or (select max(r.installment_number) from jsonb_to_recordset(p_installments) as r(installment_number int)) <> v_regular then
    raise exception 'As parcelas devem corresponder ao valor total do contrato.';
  end if;

  select * into v_existing from public.client_charges where contract_key = p_contract_key;
  if not found then
    perform 1 from public.clients where id = p_client_id and archived_at is null for update;
    if not found then raise exception 'Restaure o cliente antes de criar novas parcelas.'; end if;
    insert into public.client_charges(client_id,description,category,total_amount,installments_count,first_due_date,contract_key)
      values(p_client_id,btrim(p_description),'Honorários',p_total_amount,v_regular,v_first,p_contract_key)
      on conflict (contract_key) where contract_key is not null do nothing returning id into v_id;
    if v_id is not null then
      insert into public.client_installments(charge_id,installment_number,amount,due_date,is_down_payment)
        select v_id,r.installment_number,r.amount,r.due_date,r.is_down_payment
        from jsonb_to_recordset(p_installments) as r(installment_number int, amount numeric, due_date date, is_down_payment boolean);
      return v_id;
    end if;
    select * into v_existing from public.client_charges where contract_key = p_contract_key;
  end if;
  if v_existing.id is null or v_existing.client_id <> p_client_id or v_existing.total_amount <> p_total_amount then
    raise exception 'O contrato já está vinculado a uma cobrança diferente.';
  end if;
  select jsonb_agg(jsonb_build_object('installment_number',i.installment_number,'amount',i.amount,'due_date',i.due_date,'is_down_payment',i.is_down_payment) order by i.installment_number)
    into v_existing_rows from public.client_installments i where i.charge_id = v_existing.id;
  if v_existing_rows is distinct from v_normalized then raise exception 'As parcelas vinculadas foram alteradas. Selecione a cobrança existente para emitir o contrato.'; end if;
  return v_existing.id;
end;
$$;
revoke all on function public.create_contract_charge(uuid,text,text,numeric,jsonb) from public, anon;
grant execute on function public.create_contract_charge(uuid,text,text,numeric,jsonb) to authenticated;
notify pgrst, 'reload schema';
