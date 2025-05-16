import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/userContext";
import { socket } from "../../utils/socket";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  HiOutlineTrash,
  HiOutlineShare,
  HiOutlineUserAdd
} from "react-icons/hi";
import { Video } from "lucide-react";
import SelectUsers from "../../components/Inputs/SelectUsers";

const ChatPage = () => {
  const { user } = useContext(UserContext);
  const [shareLink, setShareLink] = useState("");
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsersForSession, setSelectedUsersForSession] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setAllUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  const fetchChatSessions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(API_PATHS.CHAT.GET_CHAT_SESSIONS, {
        params: { populate: "groupAdmin" },
      });
      setChatSessions(res.data);
    } catch (err) {
      console.error("Error fetching chat sessions:", err);
    }
  }, [user]);

  const fetchMessages = useCallback(async (sessionId) => {
    if (!sessionId) return setMessages([]);
    try {
      const res = await axiosInstance.get(
        API_PATHS.CHAT.GET_CHAT_MESSAGES(sessionId)
      );
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    setShareLink("");
    if (!user) return;

    fetchChatSessions();
    fetchAllUsers();

    socket.on("receiveMessage", (msg) => {
      if (selectedSession && msg.chatSession === selectedSession._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("activeUsers", (users) => {
      setActiveUsers(users);
    });

    socket.on("sessionDeleted", ({ sessionId }) => {
      if (selectedSession?._id === sessionId) {
        setSelectedSession(null);
      }
      setChatSessions((prev) =>
        prev.filter((session) => session._id !== sessionId)
      );
    });

    socket.on("participantAdded", (updatedSession) => {
      setChatSessions((prev) =>
        prev.map((session) =>
          session._id === updatedSession._id ? updatedSession : session
        )
      );
      if (selectedSession?._id === updatedSession._id) {
        setSelectedSession(updatedSession);
      }
    });

    socket.on("participantRemoved", (updatedSession) => {
      setChatSessions((prev) =>
        prev.map((session) =>
          session._id === updatedSession._id ? updatedSession : session
        )
      );
      if (selectedSession?._id === updatedSession._id) {
        setSelectedSession(updatedSession);
      }
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("activeUsers");
      socket.off("sessionDeleted");
      socket.off("participantAdded");
      socket.off("participantRemoved");
    };
  }, [user, fetchChatSessions, fetchAllUsers, selectedSession]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession._id);
      socket.emit("joinSession", selectedSession._id);
    }
  }, [selectedSession, fetchMessages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || !selectedSession) return;

    const messageData = {
      chatSessionId: selectedSession._id,
      text: inputMessage,
      sender: {
        id: user._id,
        name: user.name,
        profileImageUrl: user.profileImageUrl || "",
      },
    };

    socket.emit("sendMessage", messageData);
    setInputMessage("");
  };

  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    setShowAddParticipants(false);
    setShowParticipantsList(false);
  };

  const handleCreateSession = async () => {
    if (!user) return;

    // For private chats, enforce single user selection
    if (!isCreatingGroup && selectedUsersForSession.length !== 1) {
      alert("Please select exactly one user for private chat");
      return;
    }

    // For group chats, require at least one user and group name
    if (
      isCreatingGroup &&
      (selectedUsersForSession.length === 0 || !newGroupName)
    ) {
      alert("Please select at least one user and provide a group name");
      return;
    }

    try {
      const participantIds = [...selectedUsersForSession];
      if (!participantIds.includes(user._id)) participantIds.push(user._id);

      const body = { participantIds };
      if (isCreatingGroup) {
        body.isGroup = true;
        body.groupName = newGroupName;
      }

      const res = await axiosInstance.post(
        API_PATHS.CHAT.CREATE_CHAT_SESSION,
        body
      );
      if (res.data.session) {
        await fetchChatSessions();
        setSelectedSession(res.data.session);
      }
      setSelectedUsersForSession([]);
      setNewGroupName("");
      setIsCreatingGroup(false);
    } catch (err) {
      console.error("Error creating session:", err);
      alert(err.response?.data?.message || "Error creating chat session");
    }
  };

  const handleAddParticipants = async () => {
    if (!selectedSession || selectedUsersForSession.length === 0) return;

    try {
      const res = await axiosInstance.post(
        API_PATHS.CHAT.ADD_PARTICIPANTS(selectedSession._id),
        { participantIds: selectedUsersForSession }
      );

      socket.emit("addParticipants", {
        sessionId: selectedSession._id,
        participantIds: selectedUsersForSession,
      });

      setSelectedUsersForSession([]);
      setShowAddParticipants(false);
    } catch (err) {
      console.error("Error adding participants:", err);
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!selectedSession || !participantId) return;

    if (window.confirm("Are you sure you want to remove this participant?")) {
      try {
        await axiosInstance.delete(
          API_PATHS.CHAT.REMOVE_PARTICIPANT(selectedSession._id, participantId)
        );

        socket.emit("removeParticipant", {
          sessionId: selectedSession._id,
          participantId,
        });
      } catch (err) {
        console.error("Error removing participant:", err);
      }
    }
  };

  const handleGetShareLink = async () => {
    if (!user || !selectedSession) return;

    try {
      const res = await axiosInstance.get(
        API_PATHS.CHAT.GET_CHAT_SESSION_LINK(selectedSession._id)
      );
      setShareLink(res.data.link);
    } catch (err) {
      console.error("Error getting share link:", err);
      setShareLink("Error generating link");
    }
  };

  const handleDeleteSession = async () => {
    if (!user || !selectedSession) return;

    if (window.confirm("Are you sure you want to delete this chat session?")) {
      try {
        socket.emit("deleteSession", selectedSession._id);
        await axiosInstance.delete(
          API_PATHS.CHAT.DELETE_CHAT_SESSION(selectedSession._id)
        );
      } catch (err) {
        console.error("Error deleting session:", err);
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isGroupAdmin =
    selectedSession?.isGroup &&
    (selectedSession?.groupAdmin?._id === user?._id ||
      selectedSession?.groupAdmin?.toString() === user?._id);

  return (
    <DashboardLayout activeMenu="Messages">
      <div className="chat-page-container flex h-[calc(100vh-100px)] bg-gray-50">
        {/* Sidebar */}
        <div className="chat-sessions-sidebar w-1/4 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Chat Sessions</h3>
          </div>

          {/* Create Session/Group Section - Styled */}
          {user?.role === "admin" && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Create New Chat
                </h4>
                <button
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
                >
                  {isCreatingGroup ? "Private Chat" : "Group Chat"}
                </button>
              </div>

              {isCreatingGroup && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {isCreatingGroup ? "Add Members" : "Select User"}
                </label>
                <SelectUsers
                  selectedUsers={selectedUsersForSession}
                  setSelectedUsers={setSelectedUsersForSession}
                  singleSelect={!isCreatingGroup}
                />
              </div>

              <button
                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-white transition-colors ${
                  isCreatingGroup
                    ? selectedUsersForSession.length === 0 || !newGroupName
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                    : selectedUsersForSession.length !== 1
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                onClick={handleCreateSession}
                disabled={
                  isCreatingGroup
                    ? selectedUsersForSession.length === 0 || !newGroupName
                    : selectedUsersForSession.length !== 1
                }
              >
                {isCreatingGroup ? "Create Group" : "Create Chat"}
              </button>
            </div>
          )}

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {chatSessions.map((session) => (
                <li
                  key={session._id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedSession?._id === session._id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {session.isGroup ? (
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {session.groupName}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {session.participants
                              .filter((p) => p._id !== user._id)
                              .map((p) => p.name)
                              .join(", ")}
                          </span>
                        )}
                        {activeUsers.some((u) =>
                          session.participants.some((p) => p._id === u.userId)
                        ) && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        {session.isGroup && (
                          <span className="text-xs text-gray-500">
                            {session.participants.length} member
                            {session.participants.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {session.isGroup && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="flex -space-x-1">
                          {session.participants.slice(0, 3).map((p) => (
                            <img
                              key={p._id}
                              src={p.profileImageUrl || "/default-avatar.png"}
                              alt={p.name}
                              className="w-5 h-5 rounded-full border border-white"
                            />
                          ))}
                          {session.participants.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                +{session.participants.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-area flex-1 flex flex-col bg-white border-l border-gray-200">
          {/* Chat Header */}
          <div className="chat-header p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            {selectedSession ? (
              <>
                <div className="flex items-center">
                  {selectedSession.isGroup ? (
                    <div className="flex-shrink-0 mr-3">
                      <div className="flex -space-x-1">
                        {selectedSession.participants.slice(0, 3).map((p) => (
                          <img
                            key={p._id}
                            src={p.profileImageUrl || "/default-avatar.png"}
                            alt={p.name}
                            className="w-8 h-8 rounded-full border-2 border-white"
                          />
                        ))}
                        {selectedSession.participants.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">
                              +{selectedSession.participants.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 mr-3">
                      {selectedSession.participants
                        .filter((p) => p._id !== user._id)
                        .map((p) => (
                          <img
                            key={p._id}
                            src={p.profileImageUrl || "/default-avatar.png"}
                            alt={p.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ))}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedSession.isGroup ? (
                        <>
                          {selectedSession.groupName}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            (Admin: {selectedSession.groupAdmin?.name})
                          </span>
                        </>
                      ) : (
                        selectedSession.participants
                          .filter((p) => p._id !== user._id)
                          .map((p) => p.name)
                          .join(", ")
                      )}
                    </h3>
                    <div className="flex items-center">
                      {selectedSession.isGroup && (
                        <button
                          onClick={() => setShowParticipantsList(!showParticipantsList)}
                          className="text-xs text-gray-500 mr-2 hover:underline"
                        >
                          {selectedSession.participants.length} member
                          {selectedSession.participants.length !== 1 ? "s" : ""}
                        </button>
                      )}
                      {activeUsers.some((u) =>
                        selectedSession.participants.some(
                          (p) => p._id === u.userId
                        )
                      ) && (
                        <span className="text-xs text-green-500 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                          Online
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.isGroup && isGroupAdmin && (
                    <>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        onClick={() =>
                          setShowAddParticipants(!showAddParticipants)
                        }
                        title="Add Participants"
                      >
                        <HiOutlineUserAdd size={20} />
                      </button>
                    </>
                  )}

                  <button
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={() =>
                      navigate(`/meet?room=${selectedSession._id}`)
                    }
                    title="Start Video Call"
                  >
                    <Video size={20} />
                  </button>

                  {user?.role === "admin" && (
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                      onClick={handleGetShareLink}
                      title="Share Session"
                    >
                      <HiOutlineShare size={20} />
                    </button>
                  )}

                  {(isGroupAdmin ||
                    (!selectedSession.isGroup && user?.role === "admin")) && (
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
                      onClick={handleDeleteSession}
                      title={
                        selectedSession.isGroup ? "Delete Group" : "Delete Chat"
                      }
                    >
                      <HiOutlineTrash size={20} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full text-center">
                <h3 className="text-lg font-semibold text-gray-700">
                  Select a Chat Session
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Or create a new one
                </p>
              </div>
            )}
          </div>

          {/* Participants List Section */}
          {showParticipantsList && selectedSession?.isGroup && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Group Participants
                </h4>
                <button
                  onClick={() => setShowParticipantsList(false)}
                  className="text-sm px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                >
                  Close
                </button>
              </div>
              <ul className="divide-y divide-gray-200">
                {selectedSession.participants.map((participant) => (
                  <li key={participant._id} className="py-2 flex justify-between items-center">
                    <div className="flex items-center">
                      <img
                        src={participant.profileImageUrl || "/default-avatar.png"}
                        alt={participant.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {participant.name}
                          {participant._id === selectedSession.groupAdmin?._id && (
                            <span className="ml-2 text-xs text-blue-600">(Admin)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeUsers.some(u => u.userId === participant._id) ? (
                            <span className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                              Online
                            </span>
                          ) : (
                            "Offline"
                          )}
                        </p>
                      </div>
                    </div>
                    {isGroupAdmin && participant._id !== user._id && (
                      <button
                        onClick={() => handleRemoveParticipant(participant._id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add Participants Section */}
          {showAddParticipants && selectedSession && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Add Participants
                </h4>
                <button
                  onClick={() => setShowAddParticipants(false)}
                  className="text-sm px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
              </div>
              <div className="mb-3">
                <SelectUsers
                  selectedUsers={selectedUsersForSession}
                  setSelectedUsers={setSelectedUsersForSession}
                  excludeUsers={selectedSession.participants.map((p) => p._id)}
                />
              </div>
              <button
                className={`w-full py-2 px-4 rounded-md text-sm font-medium text-white transition-colors ${
                  selectedUsersForSession.length === 0
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                onClick={handleAddParticipants}
                disabled={selectedUsersForSession.length === 0}
              >
                Add Participants
              </button>
            </div>
          )}

          {/* Share Link Section */}
          {user?.role === "admin" && shareLink && (
            <div className="p-3 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-800">
                  Share this link:
                </span>
                <button
                  onClick={() => setShareLink("")}
                  className="text-xs text-yellow-600 hover:text-yellow-800"
                >
                  Hide
                </button>
              </div>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 underline truncate mt-1"
              >
                {shareLink}
              </a>
            </div>
          )}

          {/* Messages Area */}
          <div className="messages-box flex-1 overflow-y-auto p-4 bg-gray-50">
            {selectedSession ? (
              messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.sender._id === user._id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {msg.sender._id !== user._id && (
                        <div className="flex-shrink-0 mr-2">
                          <img
                            src={
                              msg.sender.profileImageUrl ||
                              "/default-avatar.png"
                            }
                            alt="avatar"
                            className="w-8 h-8 rounded-full"
                          />
                        </div>
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender._id === user._id
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white border border-gray-200 rounded-bl-none"
                        }`}
                      >
                        <div className="text-xs font-semibold">
                          {msg.sender._id === user._id
                            ? "You"
                            : msg.sender.name}
                        </div>
                        <div className="text-sm mt-1">{msg.text}</div>
                        <div
                          className={`text-xs mt-1 text-right ${
                            msg.sender._id === user._id
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTime(msg.createdAt || msg.timestamp)}
                        </div>
                      </div>
                      {msg.sender._id === user._id && (
                        <div className="flex-shrink-0 ml-2">
                          <img
                            src={user.profileImageUrl || "/default-avatar.png"}
                            alt="avatar"
                            className="w-8 h-8 rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <svg
                        className="w-12 h-12 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        ></path>
                      </svg>
                    </div>
                    <p className="text-gray-500">No messages yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Send your first message to start the conversation
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-gray-500">No chat selected</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Select a chat from the sidebar or create a new one
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {selectedSession && (
            <form
              onSubmit={sendMessage}
              className="p-4 border-t border-gray-200 bg-white"
            >
              <div className="flex items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your message..."
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={!inputMessage.trim()}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    ></path>
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatPage;