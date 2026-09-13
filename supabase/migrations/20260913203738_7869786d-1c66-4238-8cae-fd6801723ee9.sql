ALTER TABLE public.runs
ADD COLUMN sample_progress_pct integer NOT NULL DEFAULT 0
CHECK (sample_progress_pct BETWEEN 0 AND 100);

CREATE TABLE public.run_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text NOT NULL,
  actor text NOT NULL CHECK (actor IN ('agent', 'human', 'system')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.run_actions TO anon, authenticated;
GRANT ALL ON public.run_actions TO service_role;

ALTER TABLE public.run_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "run actions are readable"
ON public.run_actions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "run actions can be created"
ON public.run_actions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX run_actions_run_created_idx
ON public.run_actions (run_id, created_at);

INSERT INTO public.run_actions (run_id, action, detail, actor)
SELECT id, 'Goal submitted', 'Created this personalization run from a reviewer-supplied goal.', 'human'
FROM public.runs;

INSERT INTO public.run_actions (run_id, action, detail, actor)
SELECT id, 'Audience proposed', 'Translated the goal into explicit customer rules.', 'agent'
FROM public.runs
WHERE audience IS NOT NULL;

INSERT INTO public.run_actions (run_id, action, detail, actor)
SELECT id, 'Content assembled', 'Searched approved assets and prepared three variants.', 'agent'
FROM public.runs
WHERE variants IS NOT NULL;

INSERT INTO public.run_actions (run_id, action, detail, actor)
SELECT id, 'Experiment configured', 'Set the metric, holdout, traffic split, sample requirement, and guardrails.', 'agent'
FROM public.runs
WHERE experiment IS NOT NULL;

INSERT INTO public.run_actions (run_id, action, detail, actor, created_at)
SELECT id, 'Approved and launched', 'A human approved the proposal before any decisions could be served.', 'human', approved_at
FROM public.runs
WHERE approved_at IS NOT NULL;

INSERT INTO public.run_actions (run_id, action, detail, actor)
SELECT id, 'Readout generated', 'Generated the deterministic simulated result set and recommendation.', 'agent'
FROM public.runs
WHERE results IS NOT NULL;

UPDATE public.runs
SET sample_progress_pct = CASE WHEN results IS NULL THEN 0 ELSE 100 END;