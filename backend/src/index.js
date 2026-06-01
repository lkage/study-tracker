import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

app.get('/', (req, res) => {
  res.json({ message: 'Study Tracker API' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
  });
}

export default app;
