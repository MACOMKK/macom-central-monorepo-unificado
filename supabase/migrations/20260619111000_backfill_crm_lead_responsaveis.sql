do $$
declare
  lead_row record;
  assigned_collaborator_id uuid;
begin
  for lead_row in
    select id
    from gestao_crm.leads
    where responsavel_id is null
      and status in ('novo', 'em_atendimento')
    order by criado_em
  loop
    select c.id
    into assigned_collaborator_id
    from public.colaboradores c
    join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
    join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
    left join gestao_crm.leads active_lead
      on active_lead.responsavel_id = c.id
      and active_lead.status in ('novo', 'em_atendimento')
    where c.status <> 'inativo'
    group by c.id, c.nome
    order by count(active_lead.id), max(active_lead.atribuido_em) nulls first, c.nome
    limit 1;

    if assigned_collaborator_id is not null then
      update gestao_crm.leads
      set responsavel_id = assigned_collaborator_id
      where id = lead_row.id;
    end if;
  end loop;
end;
$$;
