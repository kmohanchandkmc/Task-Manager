const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate Jitsi JWT token for authentication
const generateJitsiToken = (user, roomName) => {
  const payload = {
    context: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.profileImageUrl || "",
      },
      features: {
        livestreaming: true,
        recording: true,
        moderation: true,
      },
    },
    aud: "jitsi",
    iss: process.env.JITSI_APP_ID || "task-manager-app",
    sub: process.env.JITSI_DOMAIN || "meet.jit.si",
    room: roomName,
  };

  return jwt.sign(payload, process.env.JITSI_SECRET || "your-jitsi-secret-key", {
    expiresIn: "1h",
  });
};

// @desc Create a new meeting
// @route POST /api/meet/create
// @access Private
const createMeeting = async (req, res) => {
  try {
    const { roomName } = req.body;
    const user = req.user;

    if (!roomName) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const token = generateJitsiToken(user, roomName);

    res.json({
      roomName,
      token,
      domain: process.env.JITSI_DOMAIN || "meet.jit.si",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createMeeting,
};