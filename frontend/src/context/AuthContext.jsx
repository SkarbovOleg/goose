import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('goose_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            logout();
            return;
          }

          await fetchProfile();
        } catch (error) {
          console.error('Auth initialization error:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Profile fetch error:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { data } = response.data;
      
      localStorage.setItem('goose_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка входа';
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await authAPI.register(username, email, password);
      const { data } = response.data;
      
      localStorage.setItem('goose_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка регистрации';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('goose_token');
      setToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await authAPI.updateProfile(updates);
      setUser(response.data.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка обновления профиля';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};