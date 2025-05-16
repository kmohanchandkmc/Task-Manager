import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { socket } from '../utils/socket';

export const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
        setUser(response.data);
        socket.connect();
        socket.emit('join', response.data._id);
      } catch (error) {
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    return () => {
      if (socket.connected) socket.disconnect();
    };
  }, []);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("token", userData.token);
    socket.connect();
    socket.emit('join', userData._id);
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("token");
    if (socket.connected) socket.disconnect();
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;