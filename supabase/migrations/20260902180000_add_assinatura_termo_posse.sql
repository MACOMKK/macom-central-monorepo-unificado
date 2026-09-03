-- Assinatura digital do Termo de Posse, 1a via (empresa/admin). Reaproveita a assinatura pessoal
-- ja capturada em public.colaboradores.assinatura_url (Perfil da intranet) -- sem assinatura
-- institucional separada. Modelo espelhado em gestao_servicos.assinaturas_anexo (uma linha por
-- assinante, sem coluna booleana redundante), ja preparado para a 2a via (colaborador) no futuro.

create table if not exists gestao_ativos.assinaturas_termo_posse (
  id uuid primary key default gen_random_uuid(),
  termo_id uuid not null references gestao_ativos.termos_posse(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  papel text not null check (papel in ('empresa', 'colaborador')),
  posicao jsonb not null,
  assinado_em timestamptz not null default now(),
  unique (termo_id, papel)
);

create index if not exists idx_assinaturas_termo_posse_termo_id
  on gestao_ativos.assinaturas_termo_posse (termo_id);

-- Novo estado intermediario: so a via "empresa" foi assinada digitalmente. "assinado" continua
-- sendo o estado final (hoje setado manualmente pelo botao "Marcar como Assinado"; passara a
-- exigir tambem a via "colaborador" quando essa fase for implementada).
alter table gestao_ativos.termos_posse drop constraint if exists termos_posse_status_check;
alter table gestao_ativos.termos_posse add constraint termos_posse_status_check
  check (status in ('gerado', 'assinado_empresa', 'assinado', 'cancelado', 'devolvido'));
