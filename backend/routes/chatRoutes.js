// routes/chatRoutes.js
//
// MILESTONE 4 — mounted at /api/chat (see server.js)
// Uses `protect` from `middleware/auth.js`, matching the same convention
// decision made for negotiationRoutes.js in Milestone 3.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/conversations', ctrl.getOrCreateConversation);
router.get('/conversations', ctrl.getMyConversations);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.post('/conversations/:id/messages', ctrl.sendMessageRest);

module.exports = router;