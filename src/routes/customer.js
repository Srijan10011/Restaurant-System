const express = require('express');
const { supabase } = require('../config/database');
const { customerSessions, sessionCounter } = require('../models/Order');

const router = express.Router();

router.post('/customer-session', async (req, res) => {
  const { tableId } = req.body;
  
  if (supabase) {
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

router.get('/orders/history/:tableId', async (req, res) => {
  if (supabase) {
    const { data: activeSession } = await supabase
      .from('customer_sessions')
      .select('id')
      .eq('table_id', req.params.tableId)
      .eq('status', 'active')
      .single();
    
    if (!activeSession) {
      return res.json([]);
    }
    
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
    const { orderHistory } = require('../models/Order');
    const tableOrders = orderHistory.filter(o => o.tableId === req.params.tableId);
    res.json(tableOrders);
  }
});

router.get('/bill/:tableId', async (req, res) => {
  if (supabase) {
    const { data: activeSession } = await supabase
      .from('customer_sessions')
      .select('id')
      .eq('table_id', req.params.tableId)
      .eq('status', 'active')
      .single();
    
    if (!activeSession) {
      return res.json({ total: 0, orders: [] });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_session_id', activeSession.id)
      .in('status', ['pending', 'preparing', 'completed', 'served']);
    
    if (error) return res.status(500).json({ error: error.message });
    
    const total = data.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    res.json({ total, orders: data.length });
  } else {
    const { orderHistory } = require('../models/Order');
    const tableOrders = orderHistory.filter(o => o.tableId === req.params.tableId);
    const total = tableOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
    res.json({ total, orders: tableOrders.length });
  }
});

module.exports = router;
