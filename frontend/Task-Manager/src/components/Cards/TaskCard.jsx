import React from "react";
import Progress from "../Progress";
import { LuPaperclip } from "react-icons/lu";
import moment from "moment";

const TaskCard = ({
  title,
  description,
  priority,
  status,
  createdAt,
  dueDate,
  assignedTo = [],
  attachmentCount = 0,
  todoChecklist = [],
  userProgress = {},
  onClick,
}) => {
  // Status and priority styling functions
  const getStatusTagColor = () => {
    switch (status) {
      case "In Progress": return "text-cyan-500 bg-cyan-50 border border-cyan-500/10";
      case "Completed": return "text-lime-500 bg-lime-50 border border-lime-500/20";
      default: return "text-violet-500 bg-violet-50 border border-violet-500/10";
    }
  };

  const getPriorityTagColor = () => {
    switch (priority) {
      case "Low": return "text-emerald-500 bg-emerald-50 border border-emerald-500/10";
      case "Medium": return "text-amber-500 bg-amber-50 border border-amber-500/10";
      default: return "text-rose-500 bg-rose-50 border border-rose-500/10";
    }
  };

  // Calculate overall task progress
  const calculateTaskProgress = () => {
    if (todoChecklist.length === 0) return 0;
    const completed = todoChecklist.filter(item => item.completed).length;
    return Math.round((completed / todoChecklist.length) * 100);
  };

  // Calculate individual user progress based on items they completed
  const calculateUserProgress = (userId) => {
    const userCompletedItems = todoChecklist.filter(item => 
      item.completed && item.completedBy && item.completedBy._id === userId
    ).length;

    return todoChecklist.length > 0
      ? Math.round((userCompletedItems / todoChecklist.length) * 100)
      : 0;
  };

  // Get count of items completed by specific user
  const getUserCompletedCount = (userId) => {
    return todoChecklist.filter(item =>
      item.completed && item.completedBy && item.completedBy._id === userId
    ).length;
  };

  return (
    <div className="bg-white rounded-xl py-4 shadow-md shadow-gray-100 border border-gray-200/50 cursor-pointer flex flex-col h-full" onClick={onClick}>
      {/* Status and Priority tags */}
      <div className="flex items-end gap-3 px-4">
        <div className={`text-[11px] font-medium ${getStatusTagColor()} px-4 py-0.5 rounded`}>
          {status}
        </div>
        <div className={`text-[11px] font-medium ${getPriorityTagColor()} px-4 py-0.5 rounded`}>
          {priority} Priority
        </div>
      </div>

      {/* Task content */}
      <div className={`px-4 border-l-[3px] ${
        status === "In Progress" ? "border-cyan-500" :
        status === "Completed" ? "border-indigo-500" :
        "border-violet-500"
      } flex-grow`}>
        <p className="text-sm font-medium text-gray-800 mt-4 line-clamp-2">{title}</p>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-[18px]">{description}</p>
        
        {/* Overall progress */}
        <p className="text-[13px] text-gray-700/80 font-medium mt-2 mb-2 leading-[18px]">
          Task Done: <span className="font-semibold text-gray-700">
            {todoChecklist.filter(item => item.completed).length} / {todoChecklist.length}
          </span>
        </p>
        <Progress progress={calculateTaskProgress()} status={status} />
      </div>

      {/* Dates and assigned users */}
      <div className="px-4 flex-grow">
        <div className="flex items-center justify-between my-1">
          <div>
            <label className="text-xs text-gray-500">Start Date</label>
            <p className="text-[13px] font-medium text-gray-900">
              {moment(createdAt).format("Do MMM YYYY")}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Due Date</label>
            <p className="text-[13px] font-medium text-gray-900">
              {moment(dueDate).format("Do MMM YYYY")}
            </p>
          </div>
        </div>

        {/* Assigned users with their progress */}
        <div className="flex flex-col gap-3 mt-3">
          {assignedTo.map((user) => {
            const userProgressValue = calculateUserProgress(user._id);
            const userCompletedCount = getUserCompletedCount(user._id);
            
            return (
              <div key={user._id} className="flex items-start gap-2">
                <img
                  src={user.profileImageUrl || "/default-avatar.png"}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border-2 border-white"
                />
                <div className="flex flex-col w-full">
                  <span className="text-sm font-medium">{user.name}</span>
                  <div className="w-full mt-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{userProgressValue}% ({userCompletedCount}/{todoChecklist.length})</span>
                    </div>
                    <Progress progress={userProgressValue} status={status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attachment section at the bottom */}
      {attachmentCount > 0 && (
        <div className="px-4 pt-3 mt-auto">
          <div className="flex items-center gap-2 bg-blue-50 px-2.5 py-1.5 rounded-lg">
            <LuPaperclip className="text-primary" />
            <span className="text-xs text-gray-900">{attachmentCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;