-- DocChaser production schema verification
-- Run this in the Supabase SQL Editor against the LIVE project.
-- It is read-only: it raises an exception if an expected production contract is missing.

DO $$
DECLARE
  required_tables text[] := ARRAY[
    'organizations','organization_members','clients','cases','documents','document_versions',
    'subscriptions','stripe_webhook_events','ai_jobs','workflow_runs','portal_messages','templates'
  ];
  t text;
  r record;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Missing required table: public.%', t;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='subscriptions'
      AND indexdef ILIKE '%unique%organization_id%'
  ) THEN
    RAISE EXCEPTION 'Missing unique organization subscription constraint/index';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='is_org_member'
  ) THEN
    RAISE EXCEPTION 'Missing private.is_org_member(uuid)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='is_org_owner'
  ) THEN
    RAISE EXCEPTION 'Missing private.is_org_owner(uuid)';
  END IF;

  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relname = ANY(required_tables)
      AND c.relkind='r'
  LOOP
    IF NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'RLS is disabled on public.%', r.relname;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents' AND public=false AND file_size_limit=20971520) THEN
    RAISE EXCEPTION 'documents storage bucket is missing or not private/20MB';
  END IF;

  RAISE NOTICE 'DocChaser production schema verification: PASS';
END $$;

-- Detailed policy/function audit output (read-only).
SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('organizations','organization_members','clients','cases','documents','document_versions','subscriptions','stripe_webhook_events','ai_jobs','workflow_runs','portal_messages','templates')
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('organization_members','subscriptions','document_versions','ai_jobs','workflow_runs','portal_messages','stripe_webhook_events')
ORDER BY tablename, policyname;

SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer, p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='private' AND p.proname IN ('is_org_member','is_org_owner'))
   OR (n.nspname='public' AND p.proname IN ('is_org_member','is_org_owner'))
ORDER BY n.nspname, p.proname;
