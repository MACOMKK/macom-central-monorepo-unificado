-- Item 3 do plano de forca bruta (SECURITY_AUDIT.md): lockout progressivo por conta.
-- Diferente do rate limit nativo do Supabase (sign_in_sign_ups, item 2), que limita por IP, um
-- ataque distribuido contra a mesma conta passa direto por ele. A forma correta e nao contornavel
-- e o Auth Hook "Password Verification Attempt", que roda dentro do proprio GoTrue a cada
-- tentativa (sucesso ou falha) e pode rejeitar mesmo uma senha correta se a conta estiver
-- travada -- ao contrario de um lockout client-side (que um atacante batendo direto na API do
-- Supabase Auth nunca aciona). Contrato do hook (input/output) conforme
-- https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook.

create table if not exists gestao_plataforma.bloqueios_login (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  tentativas_falhas integer not null default 0,
  bloqueado_ate timestamptz,
  ultima_falha_em timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table gestao_plataforma.bloqueios_login enable row level security;

-- Somente o Auth Hook (via supabase_auth_admin) le/escreve -- mesmo padrao restritivo de
-- gestao_plataforma.alertas_seguranca_enviados. Sem policy para authenticated/anon.
grant usage on schema gestao_plataforma to supabase_auth_admin;
grant all on table gestao_plataforma.bloqueios_login to supabase_auth_admin;
revoke all on table gestao_plataforma.bloqueios_login from authenticated, anon, public;

-- Perfil "moderado": so trava a partir da 5a falha seguida (nao pune erro de digitacao comum).
-- Progressao: 5 -> 1min, 10 -> 5min, 15 -> 30min, 20+ -> 1h (teto). O contador decai (reinicia
-- em 1) se a ultima falha foi ha mais de 30min, e zera imediatamente em qualquer login correto.
create or replace function gestao_plataforma.hook_verificacao_senha(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_usuario_id uuid := (event->>'user_id')::uuid;
  v_valido boolean := (event->>'valid')::boolean;
  v_row gestao_plataforma.bloqueios_login%rowtype;
  v_novas_tentativas integer;
  v_bloqueio_segundos integer;
begin
  select * into v_row from gestao_plataforma.bloqueios_login where usuario_id = v_usuario_id;

  if v_row.bloqueado_ate is not null and v_row.bloqueado_ate > now() then
    -- Conta travada: rejeita mesmo se a senha enviada agora estiver correta.
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'Muitas tentativas de login. Tente novamente em alguns minutos.'
    );
  end if;

  if v_valido then
    insert into gestao_plataforma.bloqueios_login (usuario_id, tentativas_falhas, bloqueado_ate, ultima_falha_em, atualizado_em)
    values (v_usuario_id, 0, null, null, now())
    on conflict (usuario_id) do update
      set tentativas_falhas = 0, bloqueado_ate = null, ultima_falha_em = null, atualizado_em = now();
    return jsonb_build_object('decision', 'continue');
  end if;

  if v_row.usuario_id is null or v_row.ultima_falha_em is null or now() - v_row.ultima_falha_em > interval '30 minutes' then
    v_novas_tentativas := 1;
  else
    v_novas_tentativas := v_row.tentativas_falhas + 1;
  end if;

  v_bloqueio_segundos := case
    when v_novas_tentativas >= 20 then 3600
    when v_novas_tentativas >= 15 then 1800
    when v_novas_tentativas >= 10 then 300
    when v_novas_tentativas >= 5 then 60
    else 0
  end;

  insert into gestao_plataforma.bloqueios_login (usuario_id, tentativas_falhas, bloqueado_ate, ultima_falha_em, atualizado_em)
  values (
    v_usuario_id,
    v_novas_tentativas,
    case when v_bloqueio_segundos > 0 then now() + make_interval(secs => v_bloqueio_segundos) else null end,
    now(),
    now()
  )
  on conflict (usuario_id) do update
    set tentativas_falhas = excluded.tentativas_falhas,
        bloqueado_ate = excluded.bloqueado_ate,
        ultima_falha_em = excluded.ultima_falha_em,
        atualizado_em = now();

  -- Sempre 'continue' numa falha (sem bloqueio novo ainda) -- deixa o GoTrue emitir o erro padrao
  -- de credencial invalida, sem revelar que existe lockout logo na primeira tentativa errada.
  return jsonb_build_object('decision', 'continue');
end;
$$;

grant execute on function gestao_plataforma.hook_verificacao_senha(jsonb) to supabase_auth_admin;
revoke execute on function gestao_plataforma.hook_verificacao_senha(jsonb) from authenticated, anon, public;
