import express from 'express';
import { z } from 'zod';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 모든 라우트에 인증 적용
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex like #RRGGBB'),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).refine(data => data.name !== undefined || data.color !== undefined, {
  message: 'At least one of name or color must be provided',
});

// GET /subjects
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, color, created_at FROM subjects WHERE user_id = $1 ORDER BY created_at',
      [req.userId]
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    console.error('List subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// POST /subjects
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { name, color } = parsed.data;

  try {
    const result = await query(
      'INSERT INTO subjects (user_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color, created_at',
      [req.userId, name, color]
    );
    res.status(201).json({ subject: result.rows[0] });
  } catch (err) {
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// PATCH /subjects/:id
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  // 동적으로 SET 절 구성
  const updates = [];
  const values = [];
  let idx = 1;

  if (parsed.data.name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(parsed.data.name);
  }
  if (parsed.data.color !== undefined) {
    updates.push(`color = $${idx++}`);
    values.push(parsed.data.color);
  }

  values.push(id, req.userId);

  try {
    const result = await query(
      `UPDATE subjects SET ${updates.join(', ')} 
       WHERE id = $${idx++} AND user_id = $${idx++} 
       RETURNING id, name, color, created_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ subject: result.rows[0] });
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// DELETE /subjects/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const result = await query(
      'DELETE FROM subjects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;
