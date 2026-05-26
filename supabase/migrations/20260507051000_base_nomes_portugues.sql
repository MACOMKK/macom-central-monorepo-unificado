do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'base' and t.typname = 'user_status'
  ) then
    alter type base.user_status rename to status_usuario;
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'base' and t.typname = 'role_assignment_status'
  ) then
    alter type base.role_assignment_status rename to status_atribuicao_papel;
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'base' and t.typname = 'audit_actor_type'
  ) then
    alter type base.audit_actor_type rename to tipo_ator_auditoria;
  end if;
end
$$;
do $$
begin
  begin
    alter type base.status_usuario rename value 'pending' to 'pendente';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.status_usuario rename value 'active' to 'ativo';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.status_usuario rename value 'inactive' to 'inativo';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.status_usuario rename value 'blocked' to 'bloqueado';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.status_atribuicao_papel rename value 'active' to 'ativo';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.status_atribuicao_papel rename value 'inactive' to 'inativo';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.tipo_ator_auditoria rename value 'user' to 'usuario';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.tipo_ator_auditoria rename value 'service' to 'servico';
  exception when invalid_parameter_value then null;
  end;
  begin
    alter type base.tipo_ator_auditoria rename value 'system' to 'sistema';
  exception when invalid_parameter_value then null;
  end;
end
$$;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists ao_criar_usuario_auth on auth.users;
drop trigger if exists ao_atualizar_usuario_auth on auth.users;
do $$
begin
  if exists (select 1 from pg_class where relnamespace = 'base'::regnamespace and relname = 'modules') then
    alter table base.modules rename to modulos;
  end if;
  if exists (select 1 from pg_class where relnamespace = 'base'::regnamespace and relname = 'profiles') then
    alter table base.profiles rename to perfis;
  end if;
  if exists (select 1 from pg_class where relnamespace = 'base'::regnamespace and relname = 'roles') then
    alter table base.roles rename to papeis;
  end if;
  if exists (select 1 from pg_class where relnamespace = 'base'::regnamespace and relname = 'user_role_assignments') then
    alter table base.user_role_assignments rename to atribuicoes_papel_usuario;
  end if;
  if exists (select 1 from pg_class where relnamespace = 'base'::regnamespace and relname = 'audit_log') then
    alter table base.audit_log rename to logs_auditoria;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'key'
  ) then
    alter table base.modulos rename column key to chave;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'name'
  ) then
    alter table base.modulos rename column name to nome;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'description'
  ) then
    alter table base.modulos rename column description to descricao;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'is_active'
  ) then
    alter table base.modulos rename column is_active to ativo;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'created_at'
  ) then
    alter table base.modulos rename column created_at to criado_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'modulos' and column_name = 'updated_at'
  ) then
    alter table base.modulos rename column updated_at to atualizado_em;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'full_name'
  ) then
    alter table base.perfis rename column full_name to nome_completo;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'display_name'
  ) then
    alter table base.perfis rename column display_name to nome_exibicao;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'phone'
  ) then
    alter table base.perfis rename column phone to telefone;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'avatar_url'
  ) then
    alter table base.perfis rename column avatar_url to url_avatar;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'locale'
  ) then
    alter table base.perfis rename column locale to localidade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'timezone'
  ) then
    alter table base.perfis rename column timezone to fuso_horario;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'last_sign_in_at'
  ) then
    alter table base.perfis rename column last_sign_in_at to ultimo_login_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'created_at'
  ) then
    alter table base.perfis rename column created_at to criado_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'perfis' and column_name = 'updated_at'
  ) then
    alter table base.perfis rename column updated_at to atualizado_em;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'module_id'
  ) then
    alter table base.papeis rename column module_id to modulo_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'code'
  ) then
    alter table base.papeis rename column code to codigo;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'name'
  ) then
    alter table base.papeis rename column name to nome;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'description'
  ) then
    alter table base.papeis rename column description to descricao;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'is_system'
  ) then
    alter table base.papeis rename column is_system to sistema;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'created_at'
  ) then
    alter table base.papeis rename column created_at to criado_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'papeis' and column_name = 'updated_at'
  ) then
    alter table base.papeis rename column updated_at to atualizado_em;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'user_id'
  ) then
    alter table base.atribuicoes_papel_usuario rename column user_id to usuario_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'role_id'
  ) then
    alter table base.atribuicoes_papel_usuario rename column role_id to papel_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'granted_by'
  ) then
    alter table base.atribuicoes_papel_usuario rename column granted_by to concedido_por;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'granted_at'
  ) then
    alter table base.atribuicoes_papel_usuario rename column granted_at to concedido_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'revoked_at'
  ) then
    alter table base.atribuicoes_papel_usuario rename column revoked_at to revogado_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'expires_at'
  ) then
    alter table base.atribuicoes_papel_usuario rename column expires_at to expira_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'metadata'
  ) then
    alter table base.atribuicoes_papel_usuario rename column metadata to metadados;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'created_at'
  ) then
    alter table base.atribuicoes_papel_usuario rename column created_at to criado_em;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and column_name = 'updated_at'
  ) then
    alter table base.atribuicoes_papel_usuario rename column updated_at to atualizado_em;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'actor_user_id'
  ) then
    alter table base.logs_auditoria rename column actor_user_id to ator_usuario_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'actor_type'
  ) then
    alter table base.logs_auditoria rename column actor_type to tipo_ator;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'module_key'
  ) then
    alter table base.logs_auditoria rename column module_key to modulo_chave;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'entity_schema'
  ) then
    alter table base.logs_auditoria rename column entity_schema to esquema_entidade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'entity_table'
  ) then
    alter table base.logs_auditoria rename column entity_table to tabela_entidade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'entity_id'
  ) then
    alter table base.logs_auditoria rename column entity_id to entidade_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'action'
  ) then
    alter table base.logs_auditoria rename column action to acao;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'summary'
  ) then
    alter table base.logs_auditoria rename column summary to resumo;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'request_id'
  ) then
    alter table base.logs_auditoria rename column request_id to requisicao_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'ip_address'
  ) then
    alter table base.logs_auditoria rename column ip_address to endereco_ip;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'user_agent'
  ) then
    alter table base.logs_auditoria rename column user_agent to agente_usuario;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'before_data'
  ) then
    alter table base.logs_auditoria rename column before_data to dados_antes;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'after_data'
  ) then
    alter table base.logs_auditoria rename column after_data to dados_depois;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'base' and table_name = 'logs_auditoria' and column_name = 'created_at'
  ) then
    alter table base.logs_auditoria rename column created_at to criado_em;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'modulos' and constraint_name = 'modules_key_format_chk'
  ) then
    alter table base.modulos rename constraint modules_key_format_chk to modulos_chave_formato_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'modulos' and constraint_name = 'modules_key_unique'
  ) then
    alter table base.modulos rename constraint modules_key_unique to modulos_chave_unica;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'perfis' and constraint_name = 'profiles_email_unique'
  ) then
    alter table base.perfis rename constraint profiles_email_unique to perfis_email_unico;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'perfis' and constraint_name = 'profiles_display_name_len_chk'
  ) then
    alter table base.perfis rename constraint profiles_display_name_len_chk to perfis_nome_exibicao_tamanho_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'perfis' and constraint_name = 'profiles_full_name_len_chk'
  ) then
    alter table base.perfis rename constraint profiles_full_name_len_chk to perfis_nome_completo_tamanho_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'papeis' and constraint_name = 'roles_code_format_chk'
  ) then
    alter table base.papeis rename constraint roles_code_format_chk to papeis_codigo_formato_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'papeis' and constraint_name = 'roles_module_code_unique'
  ) then
    alter table base.papeis rename constraint roles_module_code_unique to papeis_modulo_codigo_unico;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and constraint_name = 'user_role_assignments_unique'
  ) then
    alter table base.atribuicoes_papel_usuario rename constraint user_role_assignments_unique to atribuicoes_papel_usuario_unica;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'atribuicoes_papel_usuario' and constraint_name = 'user_role_assignments_revoked_after_granted_chk'
  ) then
    alter table base.atribuicoes_papel_usuario rename constraint user_role_assignments_revoked_after_granted_chk to atribuicoes_papel_usuario_revogacao_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'logs_auditoria' and constraint_name = 'audit_log_action_len_chk'
  ) then
    alter table base.logs_auditoria rename constraint audit_log_action_len_chk to logs_auditoria_acao_tamanho_chk;
  end if;
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'base' and table_name = 'logs_auditoria' and constraint_name = 'audit_log_module_key_format_chk'
  ) then
    alter table base.logs_auditoria rename constraint audit_log_module_key_format_chk to logs_auditoria_modulo_chave_formato_chk;
  end if;
end
$$;
alter index if exists base.idx_profiles_status rename to idx_perfis_status;
alter index if exists base.idx_profiles_email rename to idx_perfis_email;
alter index if exists base.idx_roles_module_id rename to idx_papeis_modulo_id;
alter index if exists base.idx_user_role_assignments_user_id rename to idx_atribuicoes_papel_usuario_usuario_id;
alter index if exists base.idx_user_role_assignments_role_id rename to idx_atribuicoes_papel_usuario_papel_id;
alter index if exists base.idx_user_role_assignments_status rename to idx_atribuicoes_papel_usuario_status;
alter index if exists base.idx_audit_log_module_entity_created_at rename to idx_logs_auditoria_modulo_entidade_criado_em;
alter index if exists base.idx_audit_log_actor_user_id_created_at rename to idx_logs_auditoria_ator_usuario_criado_em;
drop trigger if exists trg_modules_set_updated_at on base.modulos;
drop trigger if exists trg_roles_set_updated_at on base.papeis;
drop trigger if exists trg_profiles_set_updated_at on base.perfis;
drop trigger if exists trg_user_role_assignments_set_updated_at on base.atribuicoes_papel_usuario;
drop trigger if exists trg_modulos_atualizado_em on base.modulos;
drop trigger if exists trg_papeis_atualizado_em on base.papeis;
drop trigger if exists trg_perfis_atualizado_em on base.perfis;
drop trigger if exists trg_atribuicoes_papel_usuario_atualizado_em on base.atribuicoes_papel_usuario;
update base.papeis
set codigo = 'admin_plataforma',
    nome = 'Administrador da Plataforma',
    atualizado_em = timezone('utc', now())
where codigo = 'platform_admin';
update base.modulos
set nome = 'Base',
    descricao = 'Schema universal de identidade, acesso e auditoria.',
    atualizado_em = timezone('utc', now())
where chave = 'base';
drop policy if exists modules_select_authenticated on base.modulos;
drop policy if exists profiles_select_self_or_platform_admin on base.perfis;
drop policy if exists profiles_update_self_or_platform_admin on base.perfis;
drop policy if exists roles_select_authenticated on base.papeis;
drop policy if exists role_assignments_select_self_or_platform_admin on base.atribuicoes_papel_usuario;
drop policy if exists audit_log_select_platform_admin on base.logs_auditoria;
drop policy if exists modulos_select_autenticado on base.modulos;
drop policy if exists perfis_select_proprio_ou_admin_plataforma on base.perfis;
drop policy if exists perfis_update_proprio_ou_admin_plataforma on base.perfis;
drop policy if exists papeis_select_autenticado on base.papeis;
drop policy if exists atribuicoes_papel_usuario_select_proprio_ou_admin_plataforma on base.atribuicoes_papel_usuario;
drop policy if exists logs_auditoria_select_admin_plataforma on base.logs_auditoria;
drop function if exists base.current_user_id();
drop function if exists base.is_platform_admin();
drop function if exists base.user_has_role(text, text);
drop function if exists base.handle_new_auth_user();
drop function if exists base.handle_auth_user_updated();
drop function if exists base.create_audit_entry(text, text, text, uuid, text, text, jsonb, jsonb, base.tipo_ator_auditoria);
drop function if exists base.set_updated_at();
create or replace function base.definir_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := timezone('utc', now());
  return new;
end;
$$;
create or replace function base.usuario_atual_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;
create or replace function base.eh_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from base.atribuicoes_papel_usuario apu
    join base.papeis p on p.id = apu.papel_id
    join base.modulos m on m.id = p.modulo_id
    where apu.usuario_id = auth.uid()
      and apu.status = 'ativo'
      and (apu.expira_em is null or apu.expira_em > timezone('utc', now()))
      and m.chave = 'base'
      and p.codigo = 'admin_plataforma'
  )
$$;
create or replace function base.usuario_possui_papel(modulo_chave text, codigo_papel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from base.atribuicoes_papel_usuario apu
    join base.papeis p on p.id = apu.papel_id
    join base.modulos m on m.id = p.modulo_id
    where apu.usuario_id = auth.uid()
      and apu.status = 'ativo'
      and (apu.expira_em is null or apu.expira_em > timezone('utc', now()))
      and m.chave = usuario_possui_papel.modulo_chave
      and p.codigo = usuario_possui_papel.codigo_papel
  )
$$;
create or replace function base.ao_criar_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into base.perfis (
    id,
    email,
    nome_completo,
    nome_exibicao,
    url_avatar,
    ultimo_login_em
  )
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      ''
    ),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        nome_completo = coalesce(excluded.nome_completo, base.perfis.nome_completo),
        nome_exibicao = coalesce(excluded.nome_exibicao, base.perfis.nome_exibicao),
        url_avatar = coalesce(excluded.url_avatar, base.perfis.url_avatar),
        ultimo_login_em = coalesce(excluded.ultimo_login_em, base.perfis.ultimo_login_em),
        atualizado_em = timezone('utc', now());

  return new;
end;
$$;
create or replace function base.ao_atualizar_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update base.perfis
  set email = new.email,
      ultimo_login_em = coalesce(new.last_sign_in_at, base.perfis.ultimo_login_em),
      nome_completo = coalesce(
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
        base.perfis.nome_completo
      ),
      nome_exibicao = coalesce(
        nullif(
          btrim(
            coalesce(
              new.raw_user_meta_data ->> 'display_name',
              new.raw_user_meta_data ->> 'name',
              ''
            )
          ),
          ''
        ),
        base.perfis.nome_exibicao
      ),
      url_avatar = coalesce(
        nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
        base.perfis.url_avatar
      ),
      atualizado_em = timezone('utc', now())
  where id = new.id;

  return new;
end;
$$;
create or replace function base.criar_registro_auditoria(
  p_modulo_chave text,
  p_esquema_entidade text,
  p_tabela_entidade text,
  p_entidade_id uuid,
  p_acao text,
  p_resumo text default null,
  p_dados_antes jsonb default null,
  p_dados_depois jsonb default null,
  p_tipo_ator base.tipo_ator_auditoria default 'usuario'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into base.logs_auditoria (
    ator_usuario_id,
    tipo_ator,
    modulo_chave,
    esquema_entidade,
    tabela_entidade,
    entidade_id,
    acao,
    resumo,
    dados_antes,
    dados_depois
  )
  values (
    auth.uid(),
    p_tipo_ator,
    p_modulo_chave,
    p_esquema_entidade,
    p_tabela_entidade,
    p_entidade_id,
    p_acao,
    p_resumo,
    p_dados_antes,
    p_dados_depois
  )
  returning id into v_id;

  return v_id;
end;
$$;
create trigger trg_modulos_atualizado_em
before update on base.modulos
for each row execute function base.definir_atualizado_em();
create trigger trg_perfis_atualizado_em
before update on base.perfis
for each row execute function base.definir_atualizado_em();
create trigger trg_papeis_atualizado_em
before update on base.papeis
for each row execute function base.definir_atualizado_em();
create trigger trg_atribuicoes_papel_usuario_atualizado_em
before update on base.atribuicoes_papel_usuario
for each row execute function base.definir_atualizado_em();
create trigger ao_criar_usuario_auth
after insert on auth.users
for each row execute function base.ao_criar_usuario_auth();
create trigger ao_atualizar_usuario_auth
after update of email, raw_user_meta_data, last_sign_in_at on auth.users
for each row execute function base.ao_atualizar_usuario_auth();
revoke all on schema base from public;
grant usage on schema base to authenticated;
grant usage on schema base to service_role;
revoke all on all tables in schema base from public;
grant select, update on base.perfis to authenticated;
grant select on base.modulos to authenticated;
grant select on base.papeis to authenticated;
grant select on base.atribuicoes_papel_usuario to authenticated;
grant select on base.logs_auditoria to authenticated;
revoke all on all functions in schema base from public;
grant execute on function base.usuario_atual_id() to authenticated;
grant execute on function base.eh_admin_plataforma() to authenticated;
grant execute on function base.usuario_possui_papel(text, text) to authenticated;
grant execute on function base.criar_registro_auditoria(
  text,
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  base.tipo_ator_auditoria
) to service_role;
create policy modulos_select_autenticado
on base.modulos
for select
to authenticated
using (true);
create policy perfis_select_proprio_ou_admin_plataforma
on base.perfis
for select
to authenticated
using (auth.uid() = id or base.eh_admin_plataforma());
create policy perfis_update_proprio_ou_admin_plataforma
on base.perfis
for update
to authenticated
using (auth.uid() = id or base.eh_admin_plataforma())
with check (auth.uid() = id or base.eh_admin_plataforma());
create policy papeis_select_autenticado
on base.papeis
for select
to authenticated
using (true);
create policy atribuicoes_papel_usuario_select_proprio_ou_admin_plataforma
on base.atribuicoes_papel_usuario
for select
to authenticated
using (usuario_id = auth.uid() or base.eh_admin_plataforma());
create policy logs_auditoria_select_admin_plataforma
on base.logs_auditoria
for select
to authenticated
using (base.eh_admin_plataforma());
