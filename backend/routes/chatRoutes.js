const express = require('express');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const {
  createChatSession,
  getChatSessions,
  getChatMessages,
  addMessageToChat,
  getChatSessionLink,
  deleteChatSession,
  addParticipants,
  removeParticipant
} = require('../controllers/chatController');

const router = express.Router();

// Chat Session Routes
router.post('/', protect, createChatSession);
router.get('/', protect, getChatSessions);
router.get('/:sessionId/messages', protect, getChatMessages);
router.post('/:sessionId/messages', protect, addMessageToChat);
router.get('/:sessionId/link', protect, getChatSessionLink);
router.delete('/:sessionId', protect, deleteChatSession);

// Group chat routes
router.post('/:sessionId/participants', protect, addParticipants);
router.delete('/:sessionId/participants/:participantId', protect, removeParticipant);

module.exports = router;