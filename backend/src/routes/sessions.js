import express from 'express';
import { z } from 'zod';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const createSchema = z.object({
  subject_id: z.number().int().positive(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  memo: z.string().max(1000).optional(),
}).refine(data => new Date(data.ended_at) > new Date(data.started_at), {
  message: 'ended_at must be after started_at',
});

// GET /sessions?from=2026-06-01&to=2026-06-09
router.get('/', async (req, res) => {
  const { from, to, subject_id } = req.query;

  const conditions = ['s.user_id = $1'];
  const values = [req.userId];
  let idx = 2;

  if (from) {
    conditions.push(`s.started_at >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`s.started_at < $${idx++}`);
    values.push(to);
  }
  if (subject_id) {
    conditions.push(`s.subject_id = $${idx++}`);
    values.push(parseInt(subject_id, 10));
  }

  try {
    const result = await query(
      `SELECT s.id, s.subject_id, sub.name as subject_name, sub.color as subject_color,
              s.started_at, s.ended_at, s.duration_sec, s.memo, s.created_at
       FROM study_sessions s
       JOIN subjects sub ON sub.id = s.subject_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.started_at DESC
       LIMIT 500`,
      values
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /sessions
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { subject_id, started_at, ended_at, memo } = parsed.data;

  try {
    // 과목 소유권 확인
    const owns = await query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
      [subject_id, req.userId]
    );
    if (owns.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const durationSec = Math.floor(
      (new Date(ended_at).getTime() - new Date(started_at).getTime()) / 1000
    );

    const result = await query(
      `INSERT INTO study_sessions (user_id, subject_id, started_at, ended_at, duration_sec, memo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, subject_id, started_at, ended_at, duration_sec, memo, created_at`,
      [req.userId, subject_id, started_at, ended_at, durationSec, memo || null]
    );
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// DELETE /sessions/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const result = await query(
      'DELETE FROM study_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// GET /sessions/stats?from=2026-06-01&to=2026-06-09
router.get('/stats', async (req, res) => {
  const { from, to } = req.query;

  const conditions = ['s.user_id = $1'];
  const values = [req.userId];
  let idx = 2;

  if (from) {
    conditions.push(`s.started_at >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`s.started_at < $${idx++}`);
    values.push(to);
  }

  try {
    // 과목별 합계
    const bySubject = await query(
      `SELECT sub.id, sub.name, sub.color, 
              COALESCE(SUM(s.duration_sec), 0)::int as total_sec,
              COUNT(s.id)::int as session_count
       FROM subjects sub
       LEFT JOIN study_sessions s ON s.subject_id = sub.id AND ${conditions.map((c) => c).join(' AND ')}
       WHERE sub.user_id = $1
       GROUP BY sub.id, sub.name, sub.color
       ORDER BY total_sec DESC`,
      values
    );

    // 일별 합계
    const byDay = await query(
      `SELECT DATE(started_at) as day, 
              SUM(duration_sec)::int as total_sec,
              COUNT(*)::int as session_count
       FROM study_sessions s
       WHERE ${conditions.join(' AND ')}
       GROUP BY DATE(started_at)
       ORDER BY day`,
      values
    );

    // 전체 합계
    const total = await query(
      `SELECT COALESCE(SUM(duration_sec), 0)::int as total_sec,
              COUNT(*)::int as session_count
       FROM study_sessions s
       WHERE ${conditions.join(' AND ')}`,
      values
    );

    res.json({
      total: total.rows[0],
      by_subject: bySubject.rows,
      by_day: byDay.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
