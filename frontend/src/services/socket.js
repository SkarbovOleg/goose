import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Слушаем события приложения
    this.socket.on('new_message', (data) => {
      this.emitToListeners('new_message', data);
    });

    this.socket.on('message_sent', (data) => {
      this.emitToListeners('message_sent', data);
    });

    this.socket.on('message_read', (data) => {
      this.emitToListeners('message_read', data);
    });

    this.socket.on('user_typing', (data) => {
      this.emitToListeners('user_typing', data);
    });

    this.socket.on('friend_status_change', (data) => {
      this.emitToListeners('friend_status_change', data);
    });
  }

  emitToListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Также подписываемся на событие сокета
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Методы для работы с сообщениями
  sendMessage(chatId, content, messageType = 'text', metadata = {}) {
    return this.emit('send_message', {
      chatId,
      content,
      messageType,
      metadata
    });
  }

  markAsRead(messageIds, chatId) {
    return this.emit('mark_as_read', { messageIds, chatId });
  }

  // Методы для работы с чатами
  typingStart(chatId) {
    return this.emit('typing_start', { chatId });
  }

  typingStop(chatId) {
    return this.emit('typing_stop', { chatId });
  }

  // Вспомогательные методы
  addMessageListener(chatId, callback) {
    return this.on('new_message', (data) => {
      if (data.chatId === chatId) {
        callback(data);
      }
    });
  }

  addTypingListener(chatId, callback) {
    return this.on('user_typing', (data) => {
      if (data.chatId === chatId) {
        callback(data);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;