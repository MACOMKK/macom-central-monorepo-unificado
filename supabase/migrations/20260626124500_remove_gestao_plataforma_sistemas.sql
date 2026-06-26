drop trigger if exists trg_sync_sistema_to_gestao_plataforma on public.sistemas;
drop function if exists gestao_plataforma.sync_sistema_from_public();
drop table if exists gestao_plataforma.sistemas;
