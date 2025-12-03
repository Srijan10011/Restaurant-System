const express = require('express');
const { Menu } = require('../models/Menu');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await Menu.getAll();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { data, error } = await Menu.create(req.body);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', auth(['admin']), async (req, res) => {
  try {
    const { data, error } = await Menu.update(req.params.id, req.body);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const { error } = await Menu.delete(req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
