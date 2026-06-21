const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bcrypt = require('bcrypt');

// middleware — protect all admin routes except login
function requireAdminSession(req, res, next) {
  if (req.session && req.session.adminId) return next();
  res.redirect('/admin/login');
}

// GET /admin/login
router.get('/login', (req, res) => {
  res.render('admin-login', { error: null, admin: false, title: 'Admin Login' });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND role = 'admin'`,
      [email]
    );
    if (result.rows.length === 0)
      return res.render('admin-login', { error: 'Invalid credentials', admin: false, title: 'Admin Login' });

    const user = result.rows[0];

    if (!user.password_hash)
      return res.render('admin-login', { error: 'This account has no password set', admin: false, title: 'Admin Login' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.render('admin-login', { error: 'Invalid credentials', admin: false, title: 'Admin Login' });

    req.session.adminId = user.id;
    req.session.adminName = user.name;
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin-login', { error: 'Server error', admin: false, title: 'Admin Login' });
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// GET /admin/dashboard
router.get('/dashboard', requireAdminSession, async (req, res) => {
  try {
    const eventsResult = await pool.query(`
      SELECT e.*, COUNT(r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id
      ORDER BY e.starts_at ASC
    `);

    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM registrations WHERE status = 'confirmed') as total_registrations,
        (SELECT COUNT(*) FROM registrations WHERE status = 'waitlisted') as total_waitlisted
    `);

    res.render('admin-dashboard', {
      events: eventsResult.rows,
      stats: {
        totalEvents: statsResult.rows[0].total_events,
        totalRegistrations: statsResult.rows[0].total_registrations,
        totalWaitlisted: statsResult.rows[0].total_waitlisted
      },
      admin: true,
      title: 'Dashboard'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// GET /admin/fests/new
router.get('/fests/new', requireAdminSession, (req, res) => {
  res.render('admin-new-fest', { error: null, success: null, admin: true, title: 'New Fest' });
});

// POST /admin/fests/new
router.post('/fests/new', requireAdminSession, async (req, res) => {
  const { name, description } = req.body;
  try {
    await pool.query(
      `INSERT INTO fests (name, description, created_by) VALUES ($1, $2, $3)`,
      [name, description, req.session.adminId]
    );
    res.render('admin-new-fest', { error: null, success: `Fest "${name}" created!`, admin: true, title: 'New Fest' });
  } catch (err) {
    console.error(err);
    res.render('admin-new-fest', { error: 'Failed to create fest', success: null, admin: true, title: 'New Fest' });
  }
});

// GET /admin/events/new
router.get('/events/new', requireAdminSession, async (req, res) => {
  try {
    const fests = await pool.query(`SELECT * FROM fests ORDER BY created_at DESC`);
    res.render('admin-new-event', { fests: fests.rows, error: null, success: null, admin: true, title: 'New Event' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST /admin/events/new
router.post('/events/new', requireAdminSession, async (req, res) => {
  const { fest_id, name, description, event_type, capacity, venue, starts_at, ends_at } = req.body;
  try {
    await pool.query(`
      INSERT INTO events (fest_id, name, description, event_type, capacity, venue, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [fest_id, name, description, event_type, capacity, venue, starts_at, ends_at]);

    const fests = await pool.query(`SELECT * FROM fests ORDER BY created_at DESC`);
    res.render('admin-new-event', {
      fests: fests.rows,
      error: null,
      success: `Event "${name}" created!`,
      admin: true,
      title: 'New Event'
    });
  } catch (err) {
    console.error(err);
    const fests = await pool.query(`SELECT * FROM fests ORDER BY created_at DESC`);
    res.render('admin-new-event', {
      fests: fests.rows,
      error: 'Failed to create event',
      success: null,
      admin: true,
      title: 'New Event'
    });
  }
});

// GET /admin/events/:id/registrations
router.get('/events/:id/registrations', requireAdminSession, async (req, res) => {
  try {
    const eventResult = await pool.query(`
      SELECT e.*, COUNT(r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [req.params.id]);

    if (eventResult.rows.length === 0) return res.redirect('/admin/dashboard');

    const regsResult = await pool.query(`
      SELECT r.*, u.name as user_name, u.email as user_email, t.name as team_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN teams t ON r.team_id = t.id
      WHERE r.event_id = $1
      ORDER BY r.registered_at DESC
    `, [req.params.id]);

    res.render('admin-registrations', {
      event: eventResult.rows[0],
      registrations: regsResult.rows,
      admin: true,
      title: 'Registrations'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;