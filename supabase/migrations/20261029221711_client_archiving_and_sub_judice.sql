-- Execute depois das migrations 001–005. Apenas adiciona campos;
-- preserva clientes, cobranças, parcelas, receitas e as políticas compartilhadas existentes.
alter table public.clients
  add column if not exists archived_at timestamptz;

alter table public.client_charges
  add column if not exists is_sub_judice boolean not null default false;

comment on column public.clients.archived_at is
  'Data de arquivamento do cliente. NULL indica cliente ativo; o histórico é preservado.';
comment on column public.client_charges.is_sub_judice is
  'Cobrança em discussão judicial; parcelas não pagas aparecem como Sob judice, sem alterar receitas.';
