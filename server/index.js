const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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