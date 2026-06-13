const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');
const { registerForEvent } = require('../services/registrationService');

// POST /api/registrations — register for an event
router.post('/', authenticate, async (req, res) => {
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });

  const result = await registerForEvent(req.user.id, event_id);
  res.status(result.status).json(result);
});

// GET /api/registrations/my — get my registrations
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, e.name as event_name, e.starts_at, e.ends_at, e.venue
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = $1
      ORDER BY r.registered_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/registrations/:id — cancel a registration
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const reg = await pool.query(
      `SELECT * FROM registrations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (reg.rows.length === 0)
      return res.status(404).json({ error: 'Registration not found' });

    await pool.query(
      `UPDATE registrations SET status = 'cancelled' WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;