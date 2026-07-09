alter table gestao_intranet.documentos
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_intranet_documentos_empresa_id
  on gestao_intranet.documentos (empresa_id);

create index if not exists idx_intranet_documentos_empresa_id_categoria
  on gestao_intranet.documentos (empresa_id, categoria);

update gestao_intranet.documentos d
set empresa_id = e.id
from public.empresas e
where d.empresa_id is null
  and (
    (d.empresa = 'macom_motors' and e.nome = 'Macom Motos')
    or (d.empresa = 'macom_mitsubishi' and e.nome = 'Macom Mitsubishi')
  );
