const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customer');
const debugRoutes = require('./routes/debug');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/menu', menuRoutes);
app.use('/orders', orderRoutes);
app.use('/', customerRoutes);
app.use('/debug', debugRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('joinTable', (tableId) => {
    socket.join(`table-${tableId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
