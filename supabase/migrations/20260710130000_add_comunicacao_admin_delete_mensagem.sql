-- Moderação: admin da comunicação pode excluir (soft-delete) mensagem de outro autor.
-- Edição de conteúdo continua restrita ao próprio autor.

drop policy if exists "comunicacao_mensagens_update_own" on gestao_comunicacao.mensagens;
create policy "comunicacao_mensagens_update_own"
  on gestao_comunicacao.mensagens
  for update
  to authenticated
  using (autor_id = public.current_colaborador_id() or public.comunicacao_is_admin())
  with check (autor_id = public.current_colaborador_id() or public.comunicacao_is_admin());

notify pgrst, 'reload schema';
