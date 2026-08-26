-- Suporta a consulta de security-check-login-lock (fallback client-side do lockout por conta,
-- item 3 do plano de forca bruta) e o registro de sucesso (security-log-login-success), que
-- filtram gestao_plataforma.logs_acesso por lower(metadados->>'email') junto com evento.
create index if not exists logs_acesso_plataforma_evento_email_idx
  on gestao_plataforma.logs_acesso (evento, (lower(metadados->>'email')), criado_em desc);
