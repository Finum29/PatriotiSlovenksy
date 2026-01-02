const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.findUserById(username);
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({ ok: false, message: 'Invalid credentials' });
    }
    req.session.user = { id: user.id, username: user.username, isAdmin: user.is_admin };
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

module.exports = router;