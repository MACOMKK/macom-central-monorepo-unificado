insert into base.atribuicoes_papel_usuario (
  usuario_id,
  papel_id,
  status,
  concedido_em,
  metadados
)
select
  u.id,
  p.id,
  'ativo',
  timezone('utc', now()),
  jsonb_build_object(
    'origem', 'migration',
    'descricao', 'Usuario de teste para acesso inicial ao sistema'
  )
from auth.users u
join base.modulos m
  on m.chave = 'base'
join base.papeis p
  on p.modulo_id = m.id
 and p.codigo = 'admin_plataforma'
where u.email = 'teste.admin@example.com'
on conflict (usuario_id, papel_id) do update
set status = excluded.status,
    revogado_em = null,
    expira_em = null,
    atualizado_em = timezone('utc', now()),
    metadados = excluded.metadados;
