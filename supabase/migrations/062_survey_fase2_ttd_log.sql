-- 062: Survey Fase 2 — tanda tangan digital + activity log
-- Signature surveyor (bukti, SRS)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS signature_name TEXT;

-- Activity log survey
CREATE TABLE IF NOT EXISTS survey_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_survey_logs_survey ON survey_logs(survey_id, created_at DESC);

ALTER TABLE survey_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS survey_logs_admin_all ON survey_logs;
CREATE POLICY survey_logs_admin_all ON survey_logs
  FOR ALL TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

DROP POLICY IF EXISTS survey_logs_surveyor_insert ON survey_logs;
CREATE POLICY survey_logs_surveyor_insert ON survey_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()));

DROP POLICY IF EXISTS survey_logs_surveyor_read ON survey_logs;
CREATE POLICY survey_logs_surveyor_read ON survey_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()) OR is_admin_or_owner());
