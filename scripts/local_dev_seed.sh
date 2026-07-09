#!/usr/bin/env bash
# Local-only dev data: creates the two dev users, pairs them, enrolls them in
# M'Cheyne. Idempotent — safe to re-run. Requires `supabase start` to be running.
#
#   alice@pamwe.dev  → "Christian" (partner A)
#   bob@pamwe.dev    → "Ammy"      (partner B)
#   password: dev-password   (matches the __DEV__ sign-in buttons)
set -euo pipefail
cd "$(dirname "$0")/.."

# Pull local keys/URLs from the running stack.
eval "$(supabase status -o env | sed 's/^/export /')"
: "${API_URL:?supabase not running}" "${SERVICE_ROLE_KEY:?}"

# psql isn't on PATH; run SQL inside the db container.
DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep supabase_db | head -1)"
: "${DB_CONTAINER:?db container not found}"
db() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

create_user() {
  local email="$1" name="$2"
  curl -s -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"dev-password\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$name\"}}" \
    >/dev/null || true   # ignore "already registered" on re-run
}

echo "Creating dev users…"
create_user "alice@pamwe.dev" "Christian"
create_user "bob@pamwe.dev" "Ammy"

echo "Pairing + enrolling in M'Cheyne…"
db <<'SQL'
DO $$
DECLARE a UUID; b UUID; cpl UUID;
BEGIN
  SELECT id INTO a FROM auth.users WHERE email = 'alice@pamwe.dev';
  SELECT id INTO b FROM auth.users WHERE email = 'bob@pamwe.dev';
  IF a IS NULL OR b IS NULL THEN RAISE EXCEPTION 'dev users missing — did create_user run?'; END IF;

  SELECT couple_id INTO cpl FROM public.users WHERE id = a;
  IF cpl IS NULL THEN
    INSERT INTO public.couples (invite_code, invite_expires_at, partner_a_id, partner_b_id, paired_at, timezone)
    VALUES ('DEVCPL', now() + interval '7 days', a, b, now(), 'America/New_York')
    RETURNING id INTO cpl;
    UPDATE public.users SET couple_id = cpl WHERE id IN (a, b);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.couple_plans WHERE couple_id = cpl) THEN
    INSERT INTO public.couple_plans (couple_id, plan_id, start_date, current_day, status)
    VALUES (cpl, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', CURRENT_DATE, 1, 'active');
  END IF;

  RAISE NOTICE 'Dev couple ready: %  (Christian + Ammy, M''Cheyne day 1)', cpl;
END $$;
SQL

echo "Done."
