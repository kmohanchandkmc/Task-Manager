const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { createMeeting } = require("../controllers/meetController");

const router = express.Router();

router.post("/create", protect, createMeeting);

module.exports = router;