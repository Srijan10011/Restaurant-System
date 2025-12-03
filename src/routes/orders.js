const express = require('express');
const { Order } = require('../models/Order');
const { auth } = require('../middleware/auth');

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
