const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db/pool');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = profile.displayName;

    // check if user already exists by google_id or email
    let result = await pool.query(
      `SELECT * FROM users WHERE google_id = $1 OR email = $2`,
      [googleId, email]
    );

    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
      // link google_id if they previously signed up with email/password
      if (!user.google_id) {
        await pool.query(
          `UPDATE users SET google_id = $1 WHERE id = $2`,
          [googleId, user.id]
        );
      }
    } else {
      // create new user — no password needed
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, google_id, role)
         VALUES ($1, $2, $3, 'student') RETURNING *`,
        [name, email, googleId]
      );
      user = insertResult.rows[0];
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;