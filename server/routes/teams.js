const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');
const { registerForEvent } = require('../services/registrationService');

// POST /api/teams — create a team
router.post('/', authenticate, async (req, res) => {
  const { name, event_id } = req.body;
  if (!name || !event_id)
    return res.status(400).json({ error: 'name and event_id are required' });

  try {
    const result = await pool.query(
      `INSERT INTO teams (name, event_id, leader_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, event_id, req.user.id]
    );
    const team = result.rows[0];

    await pool.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`,
      [team.id, req.user.id]
    );

    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/teams/join — join a team via invite code
router.post('/join', authenticate, async (req, res) => {
  const { invite_code } = req.body;
  if (!invite_code)
    return res.status(400).json({ error: 'invite_code is required' });

  const code = invite_code.toLowerCase().trim();

  try {
    const teamResult = await pool.query(
      `SELECT * FROM teams WHERE invite_code = $1`,
      [code]
    );
    if (teamResult.rows.length === 0)
      return res.status(404).json({ error: 'Invalid invite code' });

    const team = teamResult.rows[0];

    const existing = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [team.id, req.user.id]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Already in this team' });

    await pool.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`,
      [team.id, req.user.id]
    );

    res.json({ success: true, team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/my — get all teams the user is a member of
// ⚠️ MUST be before /:id route
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, e.name as event_name, e.starts_at, e.venue,
        u.name as leader_name,
        CASE WHEN EXISTS(
          SELECT 1 FROM registrations r
          WHERE r.team_id = t.id AND r.status = 'confirmed'
        ) THEN true ELSE false END as is_registered
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN events e ON t.event_id = e.id
      JOIN users u ON t.leader_id = u.id
      WHERE tm.user_id = $1
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Teams/my error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/teams/:id/register — register whole team for the event
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const teamResult = await pool.query(
      `SELECT * FROM teams WHERE id = $1 AND leader_id = $2`,
      [req.params.id, req.user.id]
    );
    if (teamResult.rows.length === 0)
      return res.status(403).json({ error: 'Only team leader can register the team' });

    const team = teamResult.rows[0];
    const result = await registerForEvent(req.user.id, team.event_id, team.id);
    res.status(result.status).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/teams/:id/registration — cancel team registration
router.delete('/:id/registration', authenticate, async (req, res) => {
  try {
    const teamResult = await pool.query(
      `SELECT * FROM teams WHERE id = $1 AND leader_id = $2`,
      [req.params.id, req.user.id]
    );
    if (teamResult.rows.length === 0)
      return res.status(403).json({ error: 'Only team leader can withdraw' });

    await pool.query(
      `UPDATE registrations SET status = 'cancelled'
       WHERE team_id = $1 AND status = 'confirmed'`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Team registration cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/:id — get team details with members

router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await pool.query(
      `SELECT * FROM teams WHERE id = $1`,
      [req.params.id]
    );
    if (team.rows.length === 0)
      return res.status(404).json({ error: 'Team not found' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
    `, [req.params.id]);

    res.json({ ...team.rows[0], members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;