-- Padroniza os dados de contato ja existentes em gestao_crm.clientes e
-- gestao_crm.leads, que hoje aceitavam telefone com formatacao livre e
-- e-mail sem validacao de formato:
--   - telefone / telefone_normalizado: apenas digitos (DDD + numero).
--   - email / email_normalizado: trim + minusculas; e-mails sem "@" (lixo
--     digitado no lugar certo) sao limpos, pois nunca poderiam ser validos.
-- Nomes com uma unica palavra nao sao alterados aqui (nao ha como inferir o
-- sobrenome automaticamente) — passam a ser bloqueados apenas em novos
-- cadastros/edicoes a partir desta mudanca (validacao em crm-api e no app).

update gestao_crm.clientes
set
  telefone = regexp_replace(telefone, '\D', '', 'g'),
  telefone_normalizado = regexp_replace(telefone, '\D', '', 'g')
where telefone <> regexp_replace(telefone, '\D', '', 'g');

update gestao_crm.leads
set
  telefone = regexp_replace(telefone, '\D', '', 'g'),
  telefone_normalizado = regexp_replace(telefone, '\D', '', 'g')
where telefone <> regexp_replace(telefone, '\D', '', 'g');

update gestao_crm.clientes
set
  email = case when trim(lower(email)) like '%@%.%' then trim(lower(email)) else null end,
  email_normalizado = case when trim(lower(email)) like '%@%.%' then trim(lower(email)) else null end
where email is not null
  and (email <> trim(lower(email)) or email not like '%@%.%');

update gestao_crm.leads
set
  email = case when trim(lower(email)) like '%@%.%' then trim(lower(email)) else null end,
  email_normalizado = case when trim(lower(email)) like '%@%.%' then trim(lower(email)) else null end
where email is not null
  and (email <> trim(lower(email)) or email not like '%@%.%');
