update gestao_intranet.acessos_ip_confiavel
set nivel_acesso = 'usuario',
    mod_avisos = 'view',
    mod_links = 'view',
    mod_colaboradores = 'view',
    mod_documentos = 'view',
    mod_calendario = 'view',
    mod_conhecimento = 'view',
    mod_feedback = 'view',
    ativo = true,
    atualizado_em = now();

alter table gestao_intranet.acessos_ip_confiavel
  drop constraint if exists acessos_ip_confiavel_nivel_acesso_check,
  drop constraint if exists acessos_ip_confiavel_mod_avisos_check,
  drop constraint if exists acessos_ip_confiavel_mod_links_check,
  drop constraint if exists acessos_ip_confiavel_mod_colaboradores_check,
  drop constraint if exists acessos_ip_confiavel_mod_documentos_check,
  drop constraint if exists acessos_ip_confiavel_mod_calendario_check,
  drop constraint if exists acessos_ip_confiavel_mod_conhecimento_check,
  drop constraint if exists acessos_ip_confiavel_mod_feedback_check;

alter table gestao_intranet.acessos_ip_confiavel
  add constraint acessos_ip_confiavel_nivel_acesso_check check (nivel_acesso = 'usuario'),
  add constraint acessos_ip_confiavel_mod_avisos_check check (mod_avisos = 'view'),
  add constraint acessos_ip_confiavel_mod_links_check check (mod_links = 'view'),
  add constraint acessos_ip_confiavel_mod_colaboradores_check check (mod_colaboradores = 'view'),
  add constraint acessos_ip_confiavel_mod_documentos_check check (mod_documentos = 'view'),
  add constraint acessos_ip_confiavel_mod_calendario_check check (mod_calendario = 'view'),
  add constraint acessos_ip_confiavel_mod_conhecimento_check check (mod_conhecimento = 'view'),
  add constraint acessos_ip_confiavel_mod_feedback_check check (mod_feedback = 'view');
