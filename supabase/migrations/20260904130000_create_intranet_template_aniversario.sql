-- Terreno para o RH poder editar futuramente o corpo do e-mail de aniversario (titulo, texto,
-- html, imagem) sem depender de deploy de codigo. Hoje o conteudo enviado continua fixo em
-- montarCorpoEmail() na Edge Function intranet-notifica-aniversariante -- esta tabela nasce vazia e
-- desconectada de proposito; a troca de fonte (codigo fixo -> ler daqui) fica para uma etapa futura
-- separada. Colunas de imagem seguem o mesmo padrao de gestao_intranet.avisos
-- (20260526100000_add_intranet_announcement_images.sql).
create table gestao_intranet.template_aniversario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  corpo_texto text not null,
  corpo_html text,
  imagem_url text,
  imagem_path text,
  imagem_nome text,
  imagem_tipo text,
  imagem_tamanho bigint,
  ativo boolean not null default true,
  atualizado_por uuid references public.colaboradores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists trg_template_aniversario_set_updated_at on gestao_intranet.template_aniversario;
create trigger trg_template_aniversario_set_updated_at
before update on gestao_intranet.template_aniversario
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on gestao_intranet.template_aniversario to authenticated, service_role;
