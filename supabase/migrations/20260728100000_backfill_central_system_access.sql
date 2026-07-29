-- Backfill de acessos_usuario_sistema para o sistema 'central', a partir do
-- funcao atual de cada colaborador ativo. Passo 1 da migracao que move o gate
-- de acesso ao central/admin de colaboradores.funcao para acessos_usuario_sistema
-- (mesmo mecanismo ja usado por crm/intranet/relatorios/servicos).
update public.sistemas set ativo = true where slug = 'central';

insert into public.acessos_usuario_sistema (colaborador_id, sistema_id, nivel_acesso, ativo)
select
  c.id,
  s.id,
  c.funcao,
  true
from public.colaboradores c
cross join public.sistemas s
where s.slug = 'central'
  and s.ativo = true
  and c.funcao in ('admin', 'gestor')
  and c.status <> 'inativo'
on conflict (colaborador_id, sistema_id) do update
set nivel_acesso = excluded.nivel_acesso,
    ativo = true,
    atualizado_em = now();
