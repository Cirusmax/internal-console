-- Rode este script no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- Corrige o texto do lançamento gerado ao confirmar uma "entrada": antes saía
-- "(parcela 0/2)", agora sai "(entrada)".

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
  installment_label text;
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

  if inst.is_down_payment then
    installment_label := 'entrada';
  else
    installment_label := 'parcela ' || inst.installment_number || '/' || charge.installments_count;
  end if;

  insert into public.transactions (type, amount, category, description, occurred_on)
  values (
    'receita',
    inst.amount,
    charge.category,
    client.name || ' — ' || charge.description || ' (' || installment_label || ')',
    current_date
  )
  returning id into new_tx_id;

  update public.client_installments
    set paid = true, paid_at = now(), transaction_id = new_tx_id
    where id = installment_id;

  return new_tx_id;
end;
$$;
