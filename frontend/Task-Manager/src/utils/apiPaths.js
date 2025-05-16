export const BASE_URL = "http://localhost:8000";

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    GET_PROFILE: "/api/auth/profile",
    LOGOUT: "/api/auth/logout",
    RESET_PASSWORD: "/api/auth/reset-password",
  },

  USERS: {
    GET_ALL_USERS: "/api/users",
    GET_USER_BY_ID: (userId) => `/api/users/${userId}`,
    CREATE_USER: "/api/users",
    UPDATE_USER: (userId) => `/api/users/${userId}`,
    DELETE_USER: (userId) => `/api/users/${userId}`,
  },

  TASKS: {
    GET_DASHBOARD_DATA: "/api/tasks/dashboard-data",
    GET_USER_DASHBOARD_DATA: "/api/tasks/user-dashboard-data",
    GET_ALL_TASKS: "/api/tasks",
    GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`,
    CREATE_TASK: "/api/tasks",
    UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`,
    DELETE_TASK: (taskId) => `/api/tasks/${taskId}`,
    UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
    UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`,
  },

  IMAGE: {
    UPLOAD_IMAGE: "/api/auth/upload-image",
  },

  REPORTS: {
    GENERATE_REPORT: "/api/reports",
  },

  CHAT: {
    CREATE_CHAT_SESSION: "/api/chat",
    GET_CHAT_SESSIONS: "/api/chat",
    GET_CHAT_MESSAGES: (sessionId) => `/api/chat/${sessionId}/messages`,
    ADD_PARTICIPANTS: (sessionId) => `/api/chat/${sessionId}/participants`,
    REMOVE_PARTICIPANT: (sessionId, participantId) =>
      `/api/chat/${sessionId}/participants/${participantId}`,
    GET_CHAT_SESSION_LINK: (sessionId) => `/api/chat/${sessionId}/link`,
    DELETE_CHAT_SESSION: (sessionId) => `/api/chat/${sessionId}`,
  },
  
  MEET: {
    CREATE_MEETING: "/api/meet/create",
  },
};
