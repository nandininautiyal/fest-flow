const pool = require('../db/pool');

let io;
const setIO = (socketIO) => { io = socketIO; };

async function registerForEvent(userId, eventId, teamId = null) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock this event's row so no other request can read/write it simultaneously
    const eventResult = await client.query(
      `SELECT * FROM events WHERE id = $1 FOR UPDATE`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 404, error: 'Event not found' };
    }

    const event = eventResult.rows[0];

    // Check time slot conflict
    const conflictResult = await client.query(`
      SELECT e.name, e.starts_at, e.ends_at
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = $1
        AND r.status = 'confirmed'
        AND e.id != $2
        AND (e.starts_at, e.ends_at) OVERLAPS ($3, $4)
    `, [userId, eventId, event.starts_at, event.ends_at]);

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      const conflict = conflictResult.rows[0];
      return {
        success: false,
        status: 409,
        error: `Time slot conflict with "${conflict.name}"`
      };
    }

    // Check if already registered
    const alreadyRegistered = await client.query(
      `SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'`,
      [userId, eventId]
    );

    if (alreadyRegistered.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 409, error: 'Already registered for this event' };
    }

    // Count confirmed registrations
    const countResult = await client.query(
      `SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'confirmed'`,
      [eventId]
    );
    const confirmedCount = parseInt(countResult.rows[0].count);

    if (confirmedCount >= event.capacity) {
      // Event is full — add to waitlist
      const waitlistPosition = await client.query(
        `SELECT COUNT(*) FROM waitlist WHERE event_id = $1`,
        [eventId]
      );
      const position = parseInt(waitlistPosition.rows[0].count) + 1;

      await client.query(
        `INSERT INTO waitlist (event_id, user_id, position) VALUES ($1, $2, $3)`,
        [eventId, userId, position]
      );

      await client.query('COMMIT');
      return { success: true, status: 200, waitlisted: true, position };
    }

    // Slot available — confirm registration
    const reg = await client.query(
      `INSERT INTO registrations (event_id, user_id, team_id, status)
       VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
      [eventId, userId, teamId]
    );

    await client.query('COMMIT');

    // Emit real-time seat update to all connected clients
    if (io) {
      const countResult2 = await pool.query(
        `SELECT COUNT(*) FROM registrations WHERE event_id = $1 AND status = 'confirmed'`,
        [eventId]
      );
      io.emit('seat_update', {
        event_id: eventId,
        confirmed_count: parseInt(countResult2.rows[0].count),
        capacity: event.capacity
      });
    }

    return { success: true, status: 201, waitlisted: false, registration: reg.rows[0] };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    return { success: false, status: 500, error: 'Server error' };
  } finally {
    client.release();
  }
}

module.exports = { registerForEvent, setIO };