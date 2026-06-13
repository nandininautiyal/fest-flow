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

    // automatically add creator as a member
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

  try {
    const teamResult = await pool.query(
      `SELECT * FROM teams WHERE invite_code = $1`,
      [invite_code]
    );
    if (teamResult.rows.length === 0)
      return res.status(404).json({ error: 'Invalid invite code' });

    const team = teamResult.rows[0];

    // check already a member
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