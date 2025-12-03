const express = require('express');
const { User } = require('../models/User');
const { auth, activeSessions } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (!User.validatePassword(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const sessionId = Date.now().toString() + Math.random().toString(36);
    activeSessions.set(sessionId, {
      userId: user.id,
      role: user.role,
      username: user.username
    });
    
    res.json({ token: sessionId, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/signup', async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const { data, error } = await User.create({ username, password, role });
    if (error) {
      return res.status(500).json({ error: 'Failed to create account' });
    }
    
    res.json({ message: 'Account created successfully', id: data.id });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

router.post('/register', auth(['admin']), async (req, res) => {
  const { username, password, role } = req.body;
  
  try {
    const { data, error } = await User.create({ username, password, role });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'User created', id: data.id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;
