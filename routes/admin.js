const express = require('express');
const { authenticateAdmin, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Pack = require('../models/Pack');
const Usage = require('../models/Usage');

const router = express.Router();

router.post('/login', authenticateAdmin, (req, res) => {
  res.json({ success: true });
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagesToday = await Usage.aggregate([
      { $match: { date: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$messagesSent' } } }
    ]);
    
    const messagesTotal = await Usage.aggregate([
      { $group: { _id: null, total: { $sum: '$messagesSent' } } }
    ]);
    
    res.json({
      totalUsers,
      activeUsers,
      messagesToday: messagesToday[0]?.total || 0,
      messagesTotal: messagesTotal[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().populate('packId').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs' });
  }
});

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, packId } = req.body;
    
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingUser = await User.findOne({ code });
      if (!existingUser) isUnique = true;
    }
    
    const user = new User({ name, email, packId, code });
    await user.save();
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
});

router.put('/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la modification' });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

router.get('/packs', requireAdmin, async (req, res) => {
  try {
    const packs = await Pack.find().sort({ createdAt: -1 });
    res.json(packs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des packs' });
  }
});

router.post('/packs', requireAdmin, async (req, res) => {
  try {
    const pack = new Pack(req.body);
    await pack.save();
    
    res.json({ success: true, pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
});

router.put('/packs/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const pack = await Pack.findById(req.params.id);
    pack.isActive = !pack.isActive;
    await pack.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la modification' });
  }
});

router.delete('/packs/:id', requireAdmin, async (req, res) => {
  try {
    await Pack.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
});

router.put('/packs/:id', requireAdmin, async (req, res) => {
  try {
    const pack = await Pack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, pack });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la modification' });
  }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('packId');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la modification' });
  }
});

router.put('/users/:id/reset-quota', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.messagesUsedToday = 0;
    user.lastResetDate = new Date();
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation' });
  }
});

router.get('/packs/:id/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ packId: req.params.id }).populate('packId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs' });
  }
});

router.get('/test-accounts', requireAdmin, async (req, res) => {
  try {
    const TestAccount = require('../models/TestAccount');
    const testAccounts = await TestAccount.find().sort({ createdAt: -1 });
    res.json(testAccounts);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du chargement des comptes test' });
  }
});

module.exports = router;