const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');

// Fallback in-memory storage
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'kitchen', password: 'kitchen123', role: 'kitchen' },
  { id: 3, username: 'counter', password: 'counter123', role: 'counter' },
  { id: 4, username: 'waiter', password: 'waiter123', role: 'waiter' }
];

class User {
  static async findByUsername(username) {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      return error ? null : data;
    }
    return users.find(u => u.username === username);
  }

  static async create(userData) {
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .insert({ ...userData, password: hashedPassword })
        .select()
        .single();
      return { data, error };
    }
    
    const newUser = { id: Date.now(), ...userData, password: hashedPassword };
    users.push(newUser);
    return { data: newUser, error: null };
  }

  static validatePassword(password, hashedPassword) {
    try {
      return bcrypt.compareSync(password, hashedPassword);
    } catch (e) {
      return password === hashedPassword; // Fallback for plain text
    }
  }
}

module.exports = { User, users };
