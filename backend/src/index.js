import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './lib/db.js';
import authRouter from './routes/auth.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// 헬스체크
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      time: result.rows[0].now,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Study Tracker API' });
});

// 인증 라우터 마운트
app.use('/auth', authRouter);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
  });
}

export default app;
