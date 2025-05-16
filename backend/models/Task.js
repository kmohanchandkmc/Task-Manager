const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { 
        type: Boolean, 
        default: false 
    },
    completedBy: {  // Track which user completed this item
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { _id: true });

const userProgressSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    progress: { 
        type: Number, 
        default: 0 
    },
    completedItems: [{  // Track which items this user completed
        type: mongoose.Schema.Types.ObjectId,
        ref: "todoSchema"
    }]
}, { _id: false });

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    dueDate: { type: Date, required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ type: String }],
    todoChecklist: [todoSchema],
    progress: { type: Number, default: 0 },
    userProgress: [userProgressSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
