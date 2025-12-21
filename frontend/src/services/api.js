import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('goose_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('goose_token');
      window.location.href = '/login';
    }
    
    // Можно добавить обработку других ошибок
    return Promise.reject(error);
  }
);

// API для аутентификации
export const authAPI = {
  login: (email, password) => 
    api.post('/api/auth/login', { email, password }),
  
  register: (username, email, password) => 
    api.post('/api/auth/register', { username, email, password }),
  
  logout: () => api.post('/api/auth/logout'),
  
  getProfile: () => api.get('/api/auth/profile'),
  
  updateProfile: (data) => api.put('/api/auth/profile', data)
};

// API для чатов
export const chatAPI = {
  getChats: () => api.get('/api/chats'),
  
  getChat: (chatId) => api.get(`/api/chats/${chatId}`),
  
  createPrivateChat: (userId) => 
    api.post('/api/chats/private', { userId }),
  
  createGroupChat: (name, avatar_url, userIds) => 
    api.post('/api/chats/group', { name, avatar_url, userIds }),
  
  getMessages: (chatId, limit = 50, offset = 0) => 
    api.get(`/api/chats/${chatId}/messages?limit=${limit}&offset=${offset}`),
  
  sendMessage: (chatId, content, messageType = 'text', metadata = {}) => 
    api.post(`/api/chats/${chatId}/messages`, { 
      content, 
      message_type: messageType, 
      metadata 
    }),
  
  editMessage: (messageId, content, metadata = {}) => 
    api.put(`/api/messages/${messageId}`, { content, metadata }),
  
  deleteMessage: (messageId) => 
    api.delete(`/api/messages/${messageId}`),
  
  searchChats: (query) => 
    api.get(`/api/chats/search?q=${query}`)
};

// API для пользователей
export const userAPI = {
  searchUsers: (query) => 
    api.get(`/api/users/search?q=${query}`),
  
  getUser: (userId) => api.get(`/api/users/${userId}`),
  
  updateAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return api.post('/api/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default api;