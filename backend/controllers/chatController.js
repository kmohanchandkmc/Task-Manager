const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

const createChatSession = async (req, res) => {
  try {
    const { participantIds, isGroup, groupName } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ message: 'Participant IDs are required' });
    }

    // Add current user if not included
    if (!participantIds.includes(req.user._id.toString())) {
      participantIds.push(req.user._id);
    }

    // For group chats, require group name
    if (isGroup && !groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Check for existing session (only for non-group chats)
    if (!isGroup) {
      const existingSession = await ChatSession.findOne({
        participants: { $all: participantIds, $size: participantIds.length },
        isGroup: false
      }).populate('participants', 'name profileImageUrl');

      if (existingSession) {
        return res.status(200).json({ 
          message: 'Existing chat session found', 
          session: existingSession 
        });
      }
    }

    const sessionData = {
      participants: participantIds,
      isGroup: isGroup || false,
      groupAdmin: isGroup ? req.user._id : null,
      groupName: isGroup ? groupName : null
    };

    const newSession = await ChatSession.create(sessionData);
    const populatedSession = await ChatSession.findById(newSession._id)
      .populate('participants', 'name profileImageUrl')
      .populate('groupAdmin', 'name profileImageUrl');

    res.status(201).json({ 
      message: 'Chat session created successfully', 
      session: populatedSession 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChatSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ participants: req.user._id })
      .populate('participants', 'name profileImageUrl')
      .populate('groupAdmin', 'name profileImageUrl'); // Add this line
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session || !session.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await ChatMessage.find({ chatSession: sessionId })
      .populate('sender', 'name profileImageUrl')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addMessageToChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session || !session.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const message = await ChatMessage.create({
      chatSession: sessionId,
      sender: req.user._id,
      text,
    });

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('sender', 'name profileImageUrl');

    res.status(201).json({ message: 'Message added', message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getChatSessionLink = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);

    if (!session || !session.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const chatLink = `${process.env.CLIENT_URL}/chat?sessionId=${sessionId}`;
    res.json({ link: chatLink });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);

    if (!session || !session.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all messages in the session first
    await ChatMessage.deleteMany({ chatSession: sessionId });
    
    // Then delete the session
    await ChatSession.findByIdAndDelete(sessionId);

    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participantIds } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Only group admin can add participants
    if (session.isGroup && session.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only group admin can add participants' });
    }

    // Add new participants
    const newParticipants = participantIds.filter(id => 
      !session.participants.includes(id)
    );
    
    if (newParticipants.length === 0) {
      return res.status(400).json({ message: 'No new participants to add' });
    }

    session.participants = [...session.participants, ...newParticipants];
    await session.save();

    const populatedSession = await ChatSession.findById(session._id)
      .populate('participants', 'name profileImageUrl')
      .populate('groupAdmin', 'name profileImageUrl');

    res.status(200).json({ 
      message: 'Participants added successfully', 
      session: populatedSession 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const removeParticipant = async (req, res) => {
  try {
    const { sessionId, participantId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Only group admin can remove participants
    if (session.isGroup && session.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only group admin can remove participants' });
    }

    // Cannot remove admin from group
    if (session.isGroup && participantId === session.groupAdmin.toString()) {
      return res.status(400).json({ message: 'Cannot remove group admin' });
    }

    // Remove participant
    session.participants = session.participants.filter(id => 
      id.toString() !== participantId
    );

    // Delete session if it's not a group and only 1 participant remains
    if (!session.isGroup && session.participants.length < 2) {
      await ChatMessage.deleteMany({ chatSession: sessionId });
      await ChatSession.findByIdAndDelete(sessionId);
      return res.status(200).json({ message: 'Chat session deleted' });
    }

    await session.save();

    const populatedSession = await ChatSession.findById(session._id)
      .populate('participants', 'name profileImageUrl')
      .populate('groupAdmin', 'name profileImageUrl');

    res.status(200).json({ 
      message: 'Participant removed successfully', 
      session: populatedSession 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createChatSession,
  getChatSessions,
  getChatMessages,
  addMessageToChat,
  getChatSessionLink,
  deleteChatSession,
  addParticipants,
  removeParticipant
};