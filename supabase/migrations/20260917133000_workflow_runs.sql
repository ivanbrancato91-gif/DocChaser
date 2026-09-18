CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  case_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS workflow_runs_case_created_idx ON public.workflow_runs(case_id, created_at DESC);
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_runs_member_select ON public.workflow_runs FOR SELECT USING (private.is_org_member(organization_id));
CREATE POLICY workflow_runs_member_insert ON public.workflow_runs FOR INSERT WITH CHECK (private.is_org_member(organization_id) AND actor_user_id = auth.uid());
