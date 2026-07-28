-- Rode este script no SQL Editor do Supabase DEPOIS das migrations anteriores.
-- Adiciona suporte a "entrada" (valor pago antes da 1ª parcela) nas cobranças de cliente.

alter table public.client_installments
  add column if not exists is_down_payment boolean not null default false;
