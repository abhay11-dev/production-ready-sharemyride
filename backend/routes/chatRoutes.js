// routes/chatRoutes.js
//
// Mounted at /api/chat (see server.js). Uses `protect` from
// `middleware/auth.js`, matching the same convention used for
// negotiationRoutes.js.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/conversations', ctrl.getOrCreateConversation);
router.get('/conversations', ctrl.getMyConversations);
router.get('/conversations/:id', ctrl.getConversationById);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.get('/conversations/:id/summary', ctrl.getConversationSummary);
router.post('/conversations/:id/messages', ctrl.sendMessageRest);

module.exports = router;