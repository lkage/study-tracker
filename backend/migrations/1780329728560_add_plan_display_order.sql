-- Up Migration

ALTER TABLE study_plans
  ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터에 순서 부여: 같은 (user, plan_date) 내 created_at 순
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, plan_date 
    ORDER BY created_at
  ) - 1 AS rn
  FROM study_plans
)
UPDATE study_plans p
SET display_order = ordered.rn
FROM ordered
WHERE p.id = ordered.id;

CREATE INDEX idx_plans_user_date_order
  ON study_plans(user_id, plan_date, display_order);

-- Down Migration

DROP INDEX IF EXISTS idx_plans_user_date_order;
ALTER TABLE study_plans DROP COLUMN IF EXISTS display_order;
