import express from 'express';
import { z } from 'zod';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const upsertSchema = z.object({
  subject_id: z.number().int().positive(),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  target_sec: z.number().int().positive(),
});

// GET /plans?from=YYYY-MM-DD&to=YYYY-MM-DD&date=YYYY-MM-DD
// from/to 또는 date 중 하나
router.get('/', async (req, res) => {
  const { from, to, date } = req.query;

  const conditions = ['p.user_id = $1'];
  const values = [req.userId];
  let idx = 2;

  if (date) {
    conditions.push(`p.plan_date = $${idx++}`);
    values.push(date);
  } else {
    if (from) {
      conditions.push(`p.plan_date >= $${idx++}`);
      values.push(from);
    }
    if (to) {
      conditions.push(`p.plan_date <= $${idx++}`);
      values.push(to);
    }
  }

  try {
    const result = await query(
      `SELECT p.id, p.subject_id, sub.name as subject_name, sub.color as subject_color,
              p.plan_date, p.target_sec
       FROM study_plans p
       JOIN subjects sub ON sub.id = p.subject_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.plan_date, sub.created_at`,
      values
    );
    res.json({ plans: result.rows });
  } catch (err) {
    console.error('List plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /plans — UPSERT (한 사용자×과목×날짜는 한 줄만 존재)
router.post('/', async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { subject_id, plan_date, target_sec } = parsed.data;

  try {
    // 과목 소유권 확인
    const owns = await query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
      [subject_id, req.userId]
    );
    if (owns.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const result = await query(
      `INSERT INTO study_plans (user_id, subject_id, plan_date, target_sec)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, subject_id, plan_date)
       DO UPDATE SET target_sec = EXCLUDED.target_sec, updated_at = NOW()
       RETURNING id, subject_id, plan_date, target_sec`,
      [req.userId, subject_id, plan_date, target_sec]
    );
    res.status(200).json({ plan: result.rows[0] });
  } catch (err) {
    console.error('Upsert plan error:', err);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

// DELETE /plans?subject_id=&plan_date=
router.delete('/', async (req, res) => {
  const { subject_id, plan_date } = req.query;

  if (!subject_id || !plan_date) {
    return res.status(400).json({ error: 'subject_id and plan_date required' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan_date)) {
    return res.status(400).json({ error: 'plan_date must be YYYY-MM-DD' });
  }

  try {
    const result = await query(
      'DELETE FROM study_plans WHERE user_id = $1 AND subject_id = $2 AND plan_date = $3 RETURNING id',
      [req.userId, parseInt(subject_id, 10), plan_date]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
