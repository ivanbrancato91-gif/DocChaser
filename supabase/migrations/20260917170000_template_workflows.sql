ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS workflow_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'auto_ai', true,
    'missing_email', true,
    'correction_email', true,
    'completion_email', true,
    'reminder_days', 3
  );
