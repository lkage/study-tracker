-- Up Migration

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  nickname    VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subjects (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subjects_user ON subjects(user_id);

CREATE TABLE study_sessions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  started_at     TIMESTAMP NOT NULL,
  ended_at       TIMESTAMP NOT NULL,
  duration_sec   INTEGER NOT NULL CHECK (duration_sec > 0),
  memo           TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, started_at);
CREATE INDEX idx_sessions_subject ON study_sessions(subject_id);

-- Down Migration

DROP INDEX IF EXISTS idx_sessions_subject;
DROP INDEX IF EXISTS idx_sessions_user_date;
DROP TABLE IF EXISTS study_sessions;
DROP INDEX IF EXISTS idx_subjects_user;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
