// routes/moderationRoutes.js
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  getFlags,
  getFlagById,
  reviewFlag,
  getModerationStats,
  warnUser,
  suspendUser,
  blockUser,
  banUser,
} = require('../controllers/moderationController');

// ── Stats ────────────────────────────────────────────────────────────────
router.get('/stats', protectAdmin, getModerationStats);

// ── Flags ────────────────────────────────────────────────────────────────
router.get('/flags', protectAdmin, getFlags);
router.get('/flags/:id', protectAdmin, getFlagById);
// "Ignore" (mark reviewed, no account action) reuses the existing review endpoint.
router.post('/flags/:id/review', protectAdmin, reviewFlag);
router.post('/flags/:id/warn', protectAdmin, warnUser);
router.post('/flags/:id/suspend', protectAdmin, suspendUser);
router.post('/flags/:id/block', protectAdmin, blockUser);
router.post('/flags/:id/ban', protectAdmin, banUser);

module.exports = router;