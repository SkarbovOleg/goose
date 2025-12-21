import axios from 'axios';

// Используем переменные окружения для production, localhost для development
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
    
    // Показываем сообщение об ошибке
    const message = error.response?.data?.message || 'Произошла ошибка';
    console.error('API Error:', message);
    
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
  
  updateProfile: (data) => api.put('/api/auth/profile', data),
  
  updateStatus: (status) => api.put('/api/auth/status', { status }),
  
  searchUsers: (query) => 
    api.get(`/api/auth/users/search?q=${encodeURIComponent(query)}`),
  
  changePassword: (currentPassword, newPassword) => 
    api.put('/api/auth/change-password', { currentPassword, newPassword })
};

// API для чатов
export const chatAPI = {
  // Чаты
  getChats: () => api.get('/api/chats'),
  
  createPrivateChat: (userId) => 
    api.post('/api/chats/private', { userId }),
  
  createGroupChat: (name, avatar_url, userIds) => 
    api.post('/api/chats/group', { name, avatar_url, userIds }),
  
  getChat: (chatId) => api.get(`/api/chats/${chatId}`),
  
  updateChat: (chatId, updates) => 
    api.put(`/api/chats/${chatId}`, updates),
  
  searchChats: (query) => 
    api.get(`/api/chats/search?q=${encodeURIComponent(query)}`),
  
  // Сообщения
  getMessages: (chatId, limit = 50, offset = 0, before = null) => {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('offset', offset);
    if (before) params.append('before', before);
    
    return api.get(`/api/chats/${chatId}/messages?${params}`);
  },
  
  sendMessage: (chatId, content, messageType = 'text', metadata = {}, replyTo = null) => 
    api.post(`/api/chats/${chatId}/messages`, { 
      content, 
      message_type: messageType, 
      metadata, 
      reply_to: replyTo 
    }),
  
  editMessage: (messageId, content, metadata = {}) => 
    api.put(`/api/messages/${messageId}`, { content, metadata }),
  
  deleteMessage: (messageId) => 
    api.delete(`/api/messages/${messageId}`),
  
  markAsRead: (messageIds) => 
    api.post('/api/messages/mark-read', { messageIds }),
  
  searchMessages: (chatId, query) => 
    api.get(`/api/chats/${chatId}/messages/search?q=${encodeURIComponent(query)}`)
};

export default api;
