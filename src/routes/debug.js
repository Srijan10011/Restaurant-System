const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { users } = require('../models/User');

const router = express.Router();

router.get('/users', (req, res) => {
  if (supabase) {
    res.json({ message: 'Using Supabase - check database' });
  } else {
    const userList = users.map(u => ({ 
      id: u.id, 
      username: u.username, 
      role: u.role,
      passwordHash: u.password.substring(0, 20) + '...'
    }));
    res.json({ storage: 'in-memory', users: userList });
  }
});

router.post('/test-password', (req, res) => {
  const { password } = req.body;
  const testHash = bcrypt.hashSync('admin123', 10);
  const isValid = bcrypt.compareSync(password, testHash);
  res.json({ 
    password, 
    testHash: testHash.substring(0, 20) + '...', 
    isValid,
    actualUserHash: users[0].password.substring(0, 20) + '...'
  });
});

module.exports = router;
