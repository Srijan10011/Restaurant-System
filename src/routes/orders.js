const express = require('express');
const { Order } = require('../models/Order');
const { auth } = require('../middleware/auth');
const { supabase } = require('../config/database');

const router = express.Router();

router.post('/', async (req, res) => {
  const { tableId, items, sessionId } = req.body;
  if (!tableId) return res.status(400).json({ error: 'Table ID required' });
  
  try {
    const { data, error } = await Order.create({ tableId, items, sessionId });
    if (error) return res.status(500).json({ error: error.message });
    
    req.io.emit('orderUpdate', data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth(['kitchen', 'counter', 'waiter']), async (req, res) => {
  try {
    const { data, error } = await Order.getAll();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', auth(['kitchen']), async (req, res) => {
  try {
    const { data, error } = await Order.updateStatus(req.params.id, req.body.status);
    if (error) return res.status(500).json({ error: error.message });
    
    req.io.emit('orderUpdate', data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/serve', auth(['waiter']), async (req, res) => {
  try {
    const { data, error } = await Order.updateStatus(req.params.id, 'served');
    if (error) return res.status(500).json({ error: error.message });
    
    req.io.emit('orderUpdate', data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Modify item quantity in existing orders
router.patch('/modify', auth(['counter']), async (req, res) => {
  const { tableId, itemName, change } = req.body;
  
  if (supabase) {
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
    
    req.io.emit('orderUpdate');
    res.json({ message: 'Item modified' });
  } else {
    res.json({ message: 'Item modified' });
  }
});

// Add new items to existing table
router.post('/add-items', auth(['counter']), async (req, res) => {
  const { tableId, items } = req.body;
  
  if (supabase) {
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
    
    req.io.emit('orderUpdate');
    res.json({ message: 'Items added successfully' });
  } else {
    res.json({ message: 'Items added' });
  }
});

// Cancel specific order
router.delete('/order/:orderId', auth(['counter']), async (req, res) => {
  if (supabase) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.orderId);
    
    if (error) return res.status(500).json({ error: error.message });
    
    req.io.emit('orderUpdate');
    res.json({ message: 'Order cancelled' });
  } else {
    const { orders } = require('../models/Order');
    orders = orders.filter(o => o.id != req.params.orderId);
    req.io.emit('orderUpdate');
    res.json({ message: 'Order cancelled' });
  }
});

// Cancel all orders for a table
router.delete('/table/:tableId/cancel', auth(['counter']), async (req, res) => {
  if (supabase) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('table_id', req.params.tableId)
      .neq('status', 'served');
    
    if (error) return res.status(500).json({ error: error.message });
    
    await supabase
      .from('customer_sessions')
      .update({ status: 'completed', session_end: new Date() })
      .eq('table_id', req.params.tableId)
      .eq('status', 'active');
    
    req.io.emit('tableReset', req.params.tableId);
    res.json({ message: 'Table cancelled' });
  } else {
    const { orders } = require('../models/Order');
    orders = orders.filter(o => o.tableId != req.params.tableId);
    req.io.emit('tableReset', req.params.tableId);
    res.json({ message: 'Table cancelled' });
  }
});

// Reset table (checkout)
router.delete('/:tableId', auth(['counter']), async (req, res) => {
  try {
    const { data, error } = await Order.resetTable(req.params.tableId);
    if (error) return res.status(500).json({ error: error.message });
    
    req.io.emit('tableReset', req.params.tableId);
    res.json({ 
      message: 'Table reset - session completed', 
      totalAmount: data.totalAmount,
      tableId: data.tableId
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
