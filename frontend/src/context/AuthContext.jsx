import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

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
          // Проверяем срок действия токена
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            logout();
            return;
          }

          // Получаем профиль пользователя
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

  useEffect(() => {
    if (token && user) {
      // Подключаем WebSocket
      socketService.connect(token);
    } else if (!token) {
      // Отключаем WebSocket
      socketService.disconnect();
    }
  }, [token, user]);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
      toast.success('Добро пожаловать!');
    } catch (error) {
      console.error('Profile fetch error:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      const { data } = response.data;
      
      localStorage.setItem('goose_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      toast.success('Вход выполнен успешно!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка входа';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.register(username, email, password);
      const { data } = response.data;
      
      localStorage.setItem('goose_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      toast.success('Регистрация успешна!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка регистрации';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
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
      toast.success('Вы вышли из системы');
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await authAPI.updateProfile(updates);
      setUser(response.data.data.user);
      toast.success('Профиль обновлен');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка обновления профиля';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateStatus = async (status) => {
    try {
      const response = await authAPI.updateStatus(status);
      setUser(prev => ({ ...prev, status: response.data.data.user.status }));
      return { success: true };
    } catch (error) {
      console.error('Status update error:', error);
      return { success: false };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updateStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
