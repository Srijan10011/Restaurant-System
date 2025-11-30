const express = require('express');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Simple session storage
let activeSessions = new Map(); // sessionId -> { userId, role, username }

// Initialize Supabase only if credentials are provided and valid
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && 
      process.env.SUPABASE_URL !== 'your_supabase_url_here' && 
      process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here') {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log('✅ Using Supabase database');
  } else {
    console.log('📝 Using in-memory storage (configure .env for Supabase)');
  }
} catch (error) {
  console.log('⚠️  Supabase connection failed, using in-memory storage');
  supabase = null;
}

// Fallback in-memory storage
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'kitchen', password: 'kitchen123', role: 'kitchen' },
  { id: 3, username: 'counter', password: 'counter123', role: 'counter' },
  { id: 4, username: 'waiter', password: 'waiter123', role: 'waiter' }
];

let menu = [
  { id: 1, name: 'Burger', price: 12.99, category: 'main', available: true },
  { id: 2, name: 'Pizza', price: 15.99, category: 'main', available: true },
  { id: 3, name: 'Coke', price: 2.99, category: 'drink', available: true }
];

let orders = [];
let orderHistory = [];
let customerSessions = [];
let sessionCounter = 1;

// Simple auth middleware
const auth = (roles = []) => (req, res, next) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Access denied' });
  }

  const session = activeSessions.get(sessionId);
  if (roles.length && !roles.includes(session.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  req.user = session;
  next();
};

// Customer session management
app.post('/customer-session', async (req, res) => {
  const { tableId } = req.body;
  
  if (supabase) {
    // Use Supabase
    const { data: activeSession } = await supabase
      .from('customer_sessions')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .single();
    
    if (activeSession) {
      return res.json({ sessionId: activeSession.id, message: 'Existing session' });
    }
    
    const { data: newSession, error } = await supabase
      .from('customer_sessions')
      .insert({ table_id: tableId })
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ sessionId: newSession.id, message: 'New session created' });
  } else {
    // Use in-memory storage
    const activeSession = customerSessions.find(s => s.table_id === tableId && s.status === 'active');
    
    if (activeSession) {
      return res.json({ sessionId: activeSession.id, message: 'Existing session' });
    }
    
    const newSession = {
      id: sessionCounter++,
      table_id: tableId,
      session_start: new Date(),
      status: 'active'
    };
    
    customerSessions.push(newSession);
    res.json({ sessionId: newSession.id, message: 'New session created' });
  }
});

// Debug route to check users
app.get('/debug/users', (req, res) => {
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

// Test bcrypt
app.post('/debug/test-password', (req, res) => {
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

// Auth routes
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    if (supabase) {
      // Use Supabase
      console.log(`Supabase login attempt for: ${username}`);
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        console.log('Supabase error:', error);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      if (!user) {
        console.log(`User not found in Supabase: ${username}`);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Try both bcrypt and plain text (for flexibility)
      let passwordValid = false;
      try {
        passwordValid = bcrypt.compareSync(password, user.password);
      } catch (e) {
        // If bcrypt fails, try plain text
        passwordValid = (password === user.password);
      }
      
      if (!passwordValid) {
        console.log(`Password mismatch for: ${username}`);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      console.log(`Supabase login successful for: ${username} (${user.role})`);
      
      // Create simple session
      const sessionId = Date.now().toString() + Math.random().toString(36);
      activeSessions.set(sessionId, {
        userId: user.id,
        role: user.role,
        username: user.username
      });
      
      res.json({ token: sessionId, role: user.role });
    } else {
      // Use in-memory storage
      console.log(`Login attempt for: ${username} with password: ${password}`);
      const user = users.find(u => u.username === username);
      
      if (!user) {
        console.log(`User not found: ${username}`);
        console.log('Available users:', users.map(u => u.username));
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Temporarily use plain text comparison
      if (password !== user.password) {
        console.log(`Password mismatch for: ${username}. Expected: ${user.password}, Got: ${password}`);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      console.log(`Login successful for: ${username} (${user.role})`);
      
      // Create simple session
      const sessionId = Date.now().toString() + Math.random().toString(36);
      activeSessions.set(sessionId, {
        userId: user.id,
        role: user.role,
        username: user.username
      });
      
      res.json({ token: sessionId, role: user.role });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/signup', async (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    if (supabase) {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Create new user with hashed password
      const { data, error } = await supabase
        .from('users')
        .insert({ username, password: hashedPassword, role })
        .select()
        .single();
      
      if (error) {
        console.log('Supabase signup error:', error);
        return res.status(500).json({ error: 'Failed to create account' });
      }
      
      console.log(`New user created: ${username} (${role}) with hashed password`);
      res.json({ message: 'Account created successfully', id: data.id });
    } else {
      // Check if username already exists in memory
      const existingUser = users.find(u => u.username === username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Create new user with hashed password
      const newUser = { id: Date.now(), username, password: hashedPassword, role };
      users.push(newUser);
      
      console.log(`New user created: ${username} (${role}) with hashed password`);
      res.json({ message: 'Account created successfully', id: newUser.id });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/register', auth(['admin']), async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .insert({ username, password: hashedPassword, role })
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'User created', id: data.id });
  } else {
    const newUser = { id: Date.now(), username, password: hashedPassword, role };
    users.push(newUser);
    res.json({ message: 'User created', id: newUser.id });
  }
});

app.post('/logout', (req, res) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.json({ message: 'Logged out' });
});

app.patch('/menu/:id', auth(['admin']), async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('menu_items')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else {
    const item = menu.find(m => m.id == req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    Object.assign(item, req.body);
    res.json(item);
  }
});

app.delete('/menu/:id', auth(['admin']), async (req, res) => {
  if (supabase) {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Item deleted' });
  } else {
    menu = menu.filter(m => m.id != req.params.id);
    res.json({ message: 'Item deleted' });
  }
});

// Order routes
app.post('/orders', async (req, res) => {
  const { tableId, items, sessionId } = req.body;
  if (!tableId) return res.status(400).json({ error: 'Table ID required' });
  
  if (supabase) {
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check for existing active session for this table
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: activeSession } = await supabase
        .from('customer_sessions')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .single();
      
      if (activeSession) {
        activeSessionId = activeSession.id;
      } else {
        // Create new session only if no active session exists
        const { data: newSession, error: sessionError } = await supabase
          .from('customer_sessions')
          .insert({ table_id: tableId })
          .select()
          .single();
        
        if (sessionError) return res.status(500).json({ error: sessionError.message });
        activeSessionId = newSession.id;
      }
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_session_id: activeSessionId,
        table_id: tableId,
        items: JSON.stringify(items),
        total_amount: totalAmount
      })
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    const orderWithItems = { ...order, items: JSON.parse(order.items) };
    io.emit('orderUpdate', orderWithItems);
    res.json(orderWithItems);
  } else {
    const order = {
      id: Date.now(),
      tableId,
      table_id: tableId,
      items,
      status: 'pending',
      created_at: new Date(),
      timestamp: new Date()
    };
    
    orders.push(order);
    orderHistory.push({ ...order });
    io.emit('orderUpdate', order);
    res.json(order);
  }
});

app.get('/orders', auth(['kitchen', 'counter', 'waiter']), async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer_sessions(*)')
      .in('status', ['pending', 'preparing', 'completed', 'served'])
      .eq('customer_sessions.status', 'active')
      .order('created_at', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const ordersWithItems = data.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    
    res.json(ordersWithItems);
  } else {
    res.json(orders);
  }
});

app.get('/orders/history/:tableId', async (req, res) => {
  if (supabase) {
    // Get current active session for this table
    const { data: activeSession } = await supabase
      .from('customer_sessions')
      .select('id')
      .eq('table_id', req.params.tableId)
      .eq('status', 'active')
      .single();
    
    if (!activeSession) {
      return res.json([]); // No active session, return empty history
    }
    
    // Only get orders from the current active session
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_session_id', activeSession.id)
      .order('created_at', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    
    const ordersWithItems = data.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    
    res.json(ordersWithItems);
  } else {
    const tableOrders = orderHistory.filter(o => o.tableId === req.params.tableId);
    res.json(tableOrders);
  }
});

app.patch('/orders/:id', auth(['kitchen']), async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: req.body.status, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    const orderWithItems = { ...data, items: JSON.parse(data.items) };
    io.emit('orderUpdate', orderWithItems);
    res.json(orderWithItems);
  } else {
    const order = orders.find(o => o.id == req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    order.status = req.body.status;
    const historyOrder = orderHistory.find(o => o.id == req.params.id);
    if (historyOrder) historyOrder.status = req.body.status;
    
    io.emit('orderUpdate', order);
    res.json(order);
  }
});

app.patch('/orders/:id/serve', auth(['waiter']), async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'served', updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    const orderWithItems = { ...data, items: JSON.parse(data.items) };
    io.emit('orderUpdate', orderWithItems);
    res.json(orderWithItems);
  } else {
    const order = orders.find(o => o.id == req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    order.status = 'served';
    const historyOrder = orderHistory.find(o => o.id == req.params.id);
    if (historyOrder) historyOrder.status = 'served';
    
    io.emit('orderUpdate', order);
    res.json(order);
  }
});

// Modify item quantity in existing orders
app.patch('/orders/modify', auth(['counter']), async (req, res) => {
  const { tableId, itemName, change } = req.body;
  
  if (supabase) {
    // For now, create a new order with the item change
    // In a real system, you'd modify existing orders
    const newOrder = {
      table_id: tableId,
      items: JSON.stringify([{ name: itemName, quantity: Math.abs(change), price: 0 }]),
      status: 'pending',
      total_amount: 0
    };
    
    const { error } = await supabase
      .from('orders')
      .insert([newOrder]);
    
    if (error) return res.status(500).json({ error: error.message });
    
    io.emit('orderUpdate');
    res.json({ message: 'Item modified' });
  } else {
    res.json({ message: 'Item modified' });
  }
});

// Add new items to existing table
app.post('/orders/add-items', auth(['counter']), async (req, res) => {
  const { tableId, items } = req.body;
  
  if (supabase) {
    // Get active session for this table
    const { data: session } = await supabase
      .from('customer_sessions')
      .select('id')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .single();
    
    if (!session) {
      return res.status(400).json({ error: 'No active session for this table' });
    }
    
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const newOrder = {
      customer_session_id: session.id,
      table_id: tableId,
      items: JSON.stringify(items),
      status: 'pending',
      total_amount: totalAmount
    };
    
    const { error } = await supabase
      .from('orders')
      .insert([newOrder]);
    
    if (error) return res.status(500).json({ error: error.message });
    
    io.emit('orderUpdate');
    res.json({ message: 'Items added successfully' });
  } else {
    res.json({ message: 'Items added' });
  }
});

// Reset table (checkout) - must come before single order delete
app.delete('/orders/:tableId', auth(['counter']), async (req, res) => {
  if (supabase) {
    try {
      // Calculate total amount for the session
      const { data: tableOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('table_id', req.params.tableId)
        .in('status', ['pending', 'preparing', 'completed', 'served']);
      
      const totalAmount = tableOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      // Complete customer session with totals and end time
      const { error: sessionError } = await supabase
        .from('customer_sessions')
        .update({ 
          status: 'completed', 
          session_end: new Date(),
          total_amount: totalAmount
        })
        .eq('table_id', req.params.tableId)
        .eq('status', 'active');
      
      if (sessionError) {
        console.log('Session update error:', sessionError);
        return res.status(500).json({ error: sessionError.message });
      }

      // Mark orders as served (final status) instead of deleting
      const { data: updatedOrders, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'served',
          updated_at: new Date()
        })
        .eq('table_id', req.params.tableId)
        .neq('status', 'served')
        .select();
      
      if (updateError) {
        console.log('Order update error:', updateError);
      } else {
        console.log(`Updated ${updatedOrders?.length || 0} orders to served for table ${req.params.tableId}`);
      }
      
      console.log(`Session completed for table ${req.params.tableId} - Total: $${totalAmount}`);
      io.emit('tableReset', req.params.tableId);
      res.json({ 
        message: 'Table reset - session completed', 
        totalAmount: totalAmount,
        tableId: req.params.tableId
      });
    } catch (error) {
      console.error('Reset table error:', error);
      res.status(500).json({ error: 'Failed to reset table' });
    }
  } else {
    // In-memory fallback
    const tableOrders = orders.filter(o => o.tableId === req.params.tableId);
    const totalAmount = tableOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
    
    // Complete session in memory
    const session = customerSessions.find(s => s.table_id === req.params.tableId && s.status === 'active');
    if (session) {
      session.status = 'completed';
      session.session_end = new Date();
      session.total_amount = totalAmount;
    }
    
    // Remove orders from active list
    orders = orders.filter(o => o.tableId != req.params.tableId);
    orderHistory = orderHistory.filter(o => o.tableId != req.params.tableId);
    
    console.log(`Session completed for table ${req.params.tableId} - Total: $${totalAmount}`);
    io.emit('tableReset', req.params.tableId);
    res.json({ 
      message: 'Table reset - session completed', 
      totalAmount: totalAmount,
      tableId: req.params.tableId
    });
  }
});

// Cancel specific order (must come after table reset)
app.delete('/orders/order/:orderId', auth(['counter']), async (req, res) => {
  if (supabase) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.orderId);
    
    if (error) return res.status(500).json({ error: error.message });
    
    io.emit('orderUpdate');
    res.json({ message: 'Order cancelled' });
  } else {
    orders = orders.filter(o => o.id != req.params.orderId);
    io.emit('orderUpdate');
    res.json({ message: 'Order cancelled' });
  }
});

// Cancel all orders for a table
app.delete('/orders/table/:tableId/cancel', auth(['counter']), async (req, res) => {
  if (supabase) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('table_id', req.params.tableId)
      .neq('status', 'served');
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Also cancel the customer session
    await supabase
      .from('customer_sessions')
      .update({ status: 'completed', session_end: new Date() })
      .eq('table_id', req.params.tableId)
      .eq('status', 'active');
    
    io.emit('tableReset', req.params.tableId);
    res.json({ message: 'Table cancelled' });
  } else {
    orders = orders.filter(o => o.tableId != req.params.tableId);
    io.emit('tableReset', req.params.tableId);
    res.json({ message: 'Table cancelled' });
  }
});

app.delete('/orders/:tableId', auth(['counter']), async (req, res) => {
  if (supabase) {
    try {
      // Calculate total amount for the session
      const { data: tableOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('table_id', req.params.tableId)
        .in('status', ['pending', 'preparing', 'completed', 'served']);
      
      const totalAmount = tableOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      
      // Complete customer session with totals and end time
      const { error: sessionError } = await supabase
        .from('customer_sessions')
        .update({ 
          status: 'completed', 
          session_end: new Date(),
          total_amount: totalAmount
        })
        .eq('table_id', req.params.tableId)
        .eq('status', 'active');
      
      if (sessionError) {
        console.log('Session update error:', sessionError);
        return res.status(500).json({ error: sessionError.message });
      }

      // Mark orders as served (final status) instead of deleting
      const { data: updatedOrders, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'served',
          updated_at: new Date()
        })
        .eq('table_id', req.params.tableId)
        .neq('status', 'served')
        .select();
      
      if (updateError) {
        console.log('Order update error:', updateError);
      } else {
        console.log(`Updated ${updatedOrders?.length || 0} orders to served for table ${req.params.tableId}`);
      }
      
      console.log(`Session completed for table ${req.params.tableId} - Total: $${totalAmount}`);
      io.emit('tableReset', req.params.tableId);
      res.json({ 
        message: 'Table reset - session completed', 
        totalAmount: totalAmount,
        tableId: req.params.tableId
      });
    } catch (error) {
      console.error('Reset table error:', error);
      res.status(500).json({ error: 'Failed to reset table' });
    }
  } else {
    // In-memory fallback
    const tableOrders = orders.filter(o => o.tableId === req.params.tableId);
    const totalAmount = tableOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
    
    // Complete session in memory
    const session = customerSessions.find(s => s.table_id === req.params.tableId && s.status === 'active');
    if (session) {
      session.status = 'completed';
      session.session_end = new Date();
      session.total_amount = totalAmount;
    }
    
    // Remove orders from active list
    orders = orders.filter(o => o.tableId != req.params.tableId);
    orderHistory = orderHistory.filter(o => o.tableId != req.params.tableId);
    
    console.log(`Session completed for table ${req.params.tableId} - Total: $${totalAmount}`);
    io.emit('tableReset', req.params.tableId);
    res.json({ 
      message: 'Table reset - session completed', 
      totalAmount: totalAmount,
      tableId: req.params.tableId
    });
  }
});

// Menu routes
app.get('/menu', async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else {
    res.json(menu.filter(item => item.available));
  }
});

app.post('/menu', auth(['admin']), async (req, res) => {
  if (supabase) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(req.body)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else {
    const newItem = { id: Date.now(), ...req.body, available: true };
    menu.push(newItem);
    res.json(newItem);
  }
});

app.patch('/menu/:id', auth(['admin']), async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/menu/:id', auth(['admin']), async (req, res) => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Item deleted' });
});

// Order routes
app.patch('/orders/:id', auth(['kitchen']), async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: req.body.status, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  const orderWithItems = { ...data, items: JSON.parse(data.items) };
  io.emit('orderUpdate', orderWithItems);
  res.json(orderWithItems);
});

app.patch('/orders/:id/serve', auth(['waiter']), async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'served', updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  const orderWithItems = { ...data, items: JSON.parse(data.items) };
  io.emit('orderUpdate', orderWithItems);
  res.json(orderWithItems);
});

// Socket.io for real-time updates
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
