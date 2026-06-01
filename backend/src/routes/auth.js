import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '../lib/db.js';
import { signToken } from '../lib/jwt.js';

const router = express.Router();

// 입력 스키마 (zod로 검증)
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  nickname: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  // 입력 검증
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { email, password, nickname } = parsed.data;

  try {
    // 이메일 중복 체크
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 비밀번호 해시
    const hashed = await bcrypt.hash(password, 10);

    // DB 저장
    const result = await query(
      'INSERT INTO users (email, password, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname',
      [email, hashed, nickname]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { email, password } = parsed.data;

  try {
    const result = await query(
      'SELECT id, email, password, nickname FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id });

    res.json({
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me — 현재 사용자 정보 (보호됨, 미들웨어는 index.js에서 적용)
import { requireAuth } from '../middleware/auth.js';

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, nickname, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
