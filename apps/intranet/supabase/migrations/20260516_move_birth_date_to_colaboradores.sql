alter table public.colaboradores
  add column if not exists data_nascimento date;

update public.colaboradores c
set data_nascimento = p.data_nascimento
from gestao_intranet.perfis_colaboradores p
where p.colaborador_id = c.id
  and c.data_nascimento is null
  and p.data_nascimento is not null;
