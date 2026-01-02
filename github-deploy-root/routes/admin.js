const express = require('express');
const db = require('../db');
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ ok: false, message: 'Admin access required' });
  }
};

router.get('/audit-logs', isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await db.getAuditLogs(limit, offset);
    res.json({ ok: true, logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ ok: false, message: 'Failed to get audit logs' });
  }
});

router.post('/users/:userId/ban', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    await db.updateUser(user.id, { status: 'banned' });
    await db.logAdminAction(
      req.session.user.id,
      req.session.user.username,
      'BAN_USER',
      'user',
      user.id,
      { username: user.username, reason: req.body.reason || 'No reason provided' },
      req.ip
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to ban user' });
  }
});

router.post('/users/:userId/suspend', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    await db.updateUser(user.id, { status: 'suspended' });
    await db.logAdminAction(
      req.session.user.id,
      req.session.user.username,
      'SUSPEND_USER',
      'user',
      user.id,
      { username: user.username, reason: req.body.reason || 'No reason provided' },
      req.ip
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to suspend user' });
  }
});

router.post('/users/:userId/activate', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    await db.updateUser(user.id, { status: 'active' });
    await db.logAdminAction(
      req.session.user.id,
      req.session.user.username,
      'ACTIVATE_USER',
      'user',
      user.id,
      { username: user.username },
      req.ip
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to activate user' });
  }
});

module.exports = router;