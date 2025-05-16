const ChatMessage = require("./models/ChatMessage");
const ChatSession = require("./models/ChatSession");

let activeUsers = [];

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user joining
    socket.on("join", async (userId) => {
      const existingUser = activeUsers.find((user) => user.userId === userId);

      if (!existingUser) {
        activeUsers.push({ userId, socketId: socket.id });
      } else {
        existingUser.socketId = socket.id;
      }

      io.emit("activeUsers", activeUsers);

      try {
        const userSessions = await ChatSession.find({ participants: userId });
        userSessions.forEach((session) => {
          socket.join(session._id.toString());
        });
      } catch (error) {
        console.error("Error joining user to sessions:", error);
      }
    });

    // Handle joining a specific chat session
    socket.on("joinSession", (sessionId) => {
      socket.join(sessionId);
    });

    // Handle sending a message
    socket.on("sendMessage", async (messageData) => {
      try {
        const newMessage = await ChatMessage.create({
          chatSession: messageData.chatSessionId,
          sender: messageData.sender.id,
          text: messageData.text,
        });

        const populatedMessage = await ChatMessage.findById(newMessage._id)
          .populate("sender", "name profileImageUrl");

        io.to(messageData.chatSessionId).emit("receiveMessage", {
          ...populatedMessage.toObject(),
          chatSession: messageData.chatSessionId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    // Handle session deletion
    socket.on("deleteSession", async (sessionId) => {
      try {
        await ChatMessage.deleteMany({ chatSession: sessionId });
        await ChatSession.findByIdAndDelete(sessionId);
        io.to(sessionId).emit("sessionDeleted", { sessionId });
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    });

    // Handle adding participants
    socket.on("addParticipants", async ({ sessionId, participantIds }) => {
      try {
        const session = await ChatSession.findByIdAndUpdate(
          sessionId,
          { $addToSet: { participants: { $each: participantIds } } },
          { new: true }
        )
          .populate("participants", "name profileImageUrl")
          .populate("groupAdmin", "name profileImageUrl");

        if (session) {
          participantIds.forEach((participantId) => {
            const user = activeUsers.find((u) => u.userId === participantId);
            if (user) {
              io.to(user.socketId).emit("sessionInvite", session);
            }
          });

          io.to(sessionId).emit("participantAdded", session);
        }
      } catch (error) {
        console.error("Error adding participants:", error);
      }
    });

    // Handle removing a participant
    socket.on("removeParticipant", async ({ sessionId, participantId }) => {
      try {
        const session = await ChatSession.findByIdAndUpdate(
          sessionId,
          { $pull: { participants: participantId } },
          { new: true }
        )
          .populate("participants", "name profileImageUrl")
          .populate("groupAdmin", "name profileImageUrl");

        if (session) {
          const user = activeUsers.find((u) => u.userId === participantId);
          if (user) {
            io.to(user.socketId).emit("participantRemoved", { sessionId });
          }

          io.to(sessionId).emit("participantRemoved", session);
        }
      } catch (error) {
        console.error("Error removing participant:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
      io.emit("activeUsers", activeUsers);
    });
  });
};

module.exports = socketHandler;
