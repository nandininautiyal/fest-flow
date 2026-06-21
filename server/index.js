require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('./config/passport');
const session = require('express-session');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: [process.env.CLIENT_URL, 'http://localhost:5173'] }
});
const { setIO } = require('./services/registrationService');
setIO(io);

app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));

const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const eventRoutes = require('./routes/events');
app.use('/api/events', eventRoutes);

const registrationRoutes = require('./routes/registrations');
app.use('/api/registrations', registrationRoutes);

const teamRoutes = require('./routes/teams');
app.use('/api/teams', teamRoutes);

// test route
app.get('/', (req, res) => {
  res.json({ message: 'FestFlow API is running' });
});

// test db connection
const pool = require('./db/pool');
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('disconnect', () => console.log('user disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { io };