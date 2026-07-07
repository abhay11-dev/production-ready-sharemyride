// routes/moderationRoutes.js
//
// MILESTONE 5 — AI moderation, admin review API (see PROJECT_STATE.md §1/§6/§7)
//
// Mounted at /api/moderation in server.js. All routes are admin-only via
// protectAdmin (middleware/auth.js) — the exact same middleware adminRoutes.js
// uses, per the codebase's existing convention (do not invent a new
// admin-check pattern here).

const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
    getFlags,
    getFlagById,
    reviewFlag,
    getModerationStats,
} = require('../controllers/moderationController');

// ── Stats ────────────────────────────────────────────────────────────────
router.get('/stats', protectAdmin, getModerationStats);

// ── Flags ────────────────────────────────────────────────────────────────
router.get('/flags', protectAdmin, getFlags);
router.get('/flags/:id', protectAdmin, getFlagById);
router.post('/flags/:id/review', protectAdmin, reviewFlag);

module.exports = router;