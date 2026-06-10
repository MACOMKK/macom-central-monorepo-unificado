create or replace function gestao_intranet.list_document_storage_orphans()
returns table (
  object_id uuid,
  bucket_id text,
  file_path text,
  file_size bigint,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed_at timestamptz
)
language sql
stable
security definer
set search_path = public, storage, gestao_intranet
as $$
  select
    o.id as object_id,
    o.bucket_id,
    o.name as file_path,
    case
      when coalesce(o.metadata->>'size', '') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
      else null
    end as file_size,
    o.created_at,
    o.updated_at,
    o.last_accessed_at
  from storage.objects o
  where public.intranet_can_edit_module('documentos')
    and o.bucket_id = 'documentos'
    and o.name <> '.emptyFolderPlaceholder'
    and not exists (
      select 1
      from gestao_intranet.documentos d
      where d.arquivo_path = o.name
    )
  order by o.created_at desc nulls last;
$$;

grant execute on function gestao_intranet.list_document_storage_orphans() to authenticated;
