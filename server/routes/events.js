const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// GET /api/fests — list all fests
router.get('/fests/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM fests ORDER BY created_at ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events — browse all events (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, f.name as fest_name,
        COUNT(r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_count
      FROM events e
      LEFT JOIN fests f ON e.fest_id = f.id
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id, f.name
      ORDER BY e.starts_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/events/:id — single event detail
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, f.name as fest_name,
        COUNT(r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_count
      FROM events e
      LEFT JOIN fests f ON e.fest_id = f.id
      LEFT JOIN registrations r ON e.id = r.event_id
      WHERE e.id = $1
      GROUP BY e.id, f.name
    `, [req.params.id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Event not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/events — create event (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { fest_id, name, description, event_type, capacity, venue, starts_at, ends_at } = req.body;

  if (!fest_id || !name || !capacity || !starts_at || !ends_at)
    return res.status(400).json({ error: 'fest_id, name, capacity, starts_at, ends_at are required' });

  try {
    const result = await pool.query(`
      INSERT INTO events (fest_id, name, description, event_type, capacity, venue, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [fest_id, name, description, event_type || 'solo', capacity, venue, starts_at, ends_at]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;