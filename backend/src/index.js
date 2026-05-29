import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// DB 연결 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 헬스체크 — DB 연결까지 확인
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      time: result.rows[0].now,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});

// 루트
app.get('/', (req, res) => {
  res.json({ message: 'Study Tracker API' });
});

app.listen(port, () => {
  console.log(`🚀 API running on port ${port}`);
});
