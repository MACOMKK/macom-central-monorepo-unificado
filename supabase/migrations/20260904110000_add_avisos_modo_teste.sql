-- modo_teste: enquanto true, so o proprio criado_por ve o bloqueio (obterAvisoAtivo filtra para
-- todo mundo mais) -- permite o admin validar o aviso antes de disparar para os demais usuarios.
alter table public.avisos
  add column if not exists modo_teste boolean not null default false;
