import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 편의 함수
export const query = (text, params) => pool.query(text, params);
