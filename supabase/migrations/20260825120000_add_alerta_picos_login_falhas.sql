-- Item 5 do plano de forca bruta (SECURITY_AUDIT.md): alertar sobre picos de tentativas de
-- login falhas. Reaproveita gestao_plataforma.logs_acesso (ja compartilhada entre sistemas,
-- ver comentario em intranet-api/registrarAcessoIntranet) gravando evento = 'login_falha'
-- a cada tentativa rejeitada (colaborador_id fica null quando o e-mail nao corresponde a
-- ninguem -- so guardamos o e-mail digitado em metadados->>'email').

create index if not exists logs_acesso_plataforma_evento_criado_em_idx
  on gestao_plataforma.logs_acesso (evento, criado_em desc);

create index if not exists logs_acesso_plataforma_ip_address_idx
  on gestao_plataforma.logs_acesso (ip_address);

-- Marca de dedupe: evita reenviar o mesmo alerta a cada execucao do cron enquanto o pico
-- continua ativo. "chave" e o IP ou o e-mail que estourou o limite.
create table if not exists gestao_plataforma.alertas_seguranca_enviados (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  chave text not null,
  criado_em timestamptz not null default now()
);

create index if not exists alertas_seguranca_enviados_tipo_chave_criado_em_idx
  on gestao_plataforma.alertas_seguranca_enviados (tipo, chave, criado_em desc);

alter table gestao_plataforma.alertas_seguranca_enviados enable row level security;

-- Mesmo padrao de logs_acesso: so a Edge Function (service_role) le/escreve; admin/gestor
-- podem consultar pelo Console se algum dia ganhar uma tela para isso.
grant select on gestao_plataforma.alertas_seguranca_enviados to authenticated;
grant select, insert on gestao_plataforma.alertas_seguranca_enviados to service_role;

drop policy if exists "alertas_seguranca_enviados_select_admin_console" on gestao_plataforma.alertas_seguranca_enviados;
create policy "alertas_seguranca_enviados_select_admin_console"
on gestao_plataforma.alertas_seguranca_enviados
for select
to authenticated
using (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao in ('admin', 'gestor')
  )
);

drop policy if exists "alertas_seguranca_enviados_insert_service_role" on gestao_plataforma.alertas_seguranca_enviados;
create policy "alertas_seguranca_enviados_insert_service_role"
on gestao_plataforma.alertas_seguranca_enviados
for insert
to service_role
with check (true);
