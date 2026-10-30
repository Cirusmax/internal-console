-- Campos opcionais no banco preservam os cadastros antigos.
-- O formulário exige a qualificação mínima para novos cadastros e contratos.
alter table public.clients
  add column if not exists cpf text,
  add column if not exists nationality text,
  add column if not exists marital_status text,
  add column if not exists profession text,
  add column if not exists address text,
  add column if not exists email text,
  add column if not exists phone text;
