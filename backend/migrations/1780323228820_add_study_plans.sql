-- Up Migration

CREATE TABLE study_plans (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  plan_date   DATE NOT NULL,
  target_sec  INTEGER NOT NULL CHECK (target_sec > 0),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, subject_id, plan_date)
);

CREATE INDEX idx_plans_user_date ON study_plans(user_id, plan_date);

-- Down Migration

DROP INDEX IF EXISTS idx_plans_user_date;
DROP TABLE IF EXISTS study_plans;
