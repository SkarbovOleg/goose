// Конфигурация Socket.io
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

let io;

// Хранилище активных пользователей
const activeUsers = new Map();

/**
 * Инициализация Socket.io сервера
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware для аутентификации
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Токен аутентификации не предоставлен'));
      }

      // Верификация токена
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goose_secret_key_2024');
      
      // Поиск пользователя
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Пользователь не найден'));
      }

      // Добавляем информацию о пользователе в объект сокета
      socket.user = {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        status: user.status
      };

      socket.userId = user.id;
      next();
    } catch (error) {
      console.error('Ошибка аутентификации сокета:', error.message);
      next(new Error('Ошибка аутентификации'));
    }
  });

  // Обработка подключений
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const username = socket.user.username;

    console.log(`✅ Пользователь подключен: ${username} (${userId})`);

    // Добавляем пользователя в хранилище активных пользователей
    activeUsers.set(userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    // Обновляем статус пользователя в базе данных
    User.updateStatus(userId, 'online');

    // Присоединяем сокет к комнате пользователя
    socket.join(`user:${userId}`);

    // Присоединяем к комнатам всех активных чатов пользователя
    socket.join(`user_chats:${userId}`);

    // Уведомляем друзей об изменении статуса
    notifyFriendsStatusChange(userId, 'online');

    // Обработчики событий

    /**
     * Отправка сообщения
     */
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', metadata = {}, replyTo = null } = data;

        // Проверяем доступ к чату
        const hasAccess = await Chat.hasAccess(chatId, userId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Нет доступа к чату' });
          return;
        }

        // Проверяем содержимое сообщения
        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Сообщение не может быть пустым' });
          return;
        }

        // Создаем сообщение в базе данных
        const message = await Message.create({
          chat_id: chatId,
          sender_id: userId,
          content: content.trim(),
          message_type: messageType,
          metadata,
          reply_to: replyTo
        });

        // Обновляем время последнего сообщения в чате
        await Chat.updateLastMessageTime(chatId);

        // Получаем полную информацию о сообщении
        const fullMessage = await Message.getById(message.id);

        // Получаем информацию о чате и участниках
        const chat = await Chat.getById(chatId);
        const participants = chat.participants || [];

        // Отправляем сообщение всем участникам чата
        participants.forEach(participant => {
          io.to(`user:${participant.id}`).emit('new_message', {
            chatId,
            message: fullMessage,
            sender: {
              id: socket.user.id,
              username: socket.user.username,
              avatar_url: socket.user.avatar_url
            }
          });
        });

        // Подтверждение отправки
        socket.emit('message_sent', {
          messageId: message.id,
          chatId,
          timestamp: message.sent_at
        });

        console.log(`📨 Сообщение отправлено в чат ${chatId} от ${username}`);

      } catch (error) {
        console.error('Ошибка отправки сообщения через сокет:', error);
        socket.emit('error', { 
          message: 'Ошибка отправки сообщения',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    /**
     * Отметка сообщений как прочитанных
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const { messageIds, chatId } = data;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
          return;
        }

        // Отмечаем сообщения как прочитанные
        const markedMessages = await Message.markAsRead(messageIds, userId);

        // Уведомляем отправителей о прочтении
        for (const messageId of markedMessages) {
          const message = await Message.getById(messageId.id);
          if (message && message.sender_id !== userId) {
            io.to(`user:${message.sender_id}`).emit('message_read', {
              messageId: messageId.id,
              chatId,
              readerId: userId,
              readerName: username,
              readAt: new Date()
            });
          }
        }

      } catch (error) {
        console.error('Ошибка отметки прочитанных:', error);
      }
    });

    /**
     * Индикатор набора текста
     */
    socket.on('typing_start', async (data) => {
      try {
        const { chatId } = data;

        // Проверяем доступ к чату
        const hasAccess = await Chat.hasAccess(chatId, userId);
        if (!hasAccess) return;

        // Получаем информацию о чате
        const chat = await Chat.getById(chatId);
        const participants = chat.participants || [];

        // Уведомляем других участников
        participants.forEach(participant => {
          if (participant.id !== userId) {
            io.to(`user:${participant.id}`).emit('user_typing', {
              chatId,
              userId,
              username,
              isTyping: true
            });
          }
        });

      } catch (error) {
        console.error('Ошибка отправки индикатора набора:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { chatId } = data;

        // Проверяем доступ к чату
        const hasAccess = await Chat.hasAccess(chatId, userId);
        if (!hasAccess) return;

        // Получаем информацию о чате
        const chat = await Chat.getById(chatId);
        const participants = chat.participants || [];

        // Уведомляем других участников
        participants.forEach(participant => {
          if (participant.id !== userId) {
            io.to(`user:${participant.id}`).emit('user_typing', {
              chatId,
              userId,
              username,
              isTyping: false
            });
          }
        });

      } catch (error) {
        console.error('Ошибка остановки индикатора набора:', error);
      }
    });

    /**
     * Присоединение к комнате чата
     */
    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`👥 Пользователь ${username} присоединился к чату ${chatId}`);
    });

    /**
     * Выход из комнаты чата
     */
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`👋 Пользователь ${username} покинул чат ${chatId}`);
    });

    /**
     * Обновление статуса пользователя
     */
    socket.on('update_status', async (status) => {
      try {
        // Обновляем статус в базе данных
        await User.updateStatus(userId, status);
        
        // Обновляем в хранилище активных пользователей
        const userData = activeUsers.get(userId);
        if (userData) {
          userData.user.status = status;
          activeUsers.set(userId, userData);
        }

        // Уведомляем друзей
        notifyFriendsStatusChange(userId, status);

        console.log(`🔄 Пользователь ${username} изменил статус на: ${status}`);
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
      }
    });

    /**
     * Отключение пользователя
     */
    socket.on('disconnect', async () => {
      console.log(`❌ Пользователь отключен: ${username} (${userId})`);

      // Удаляем пользователя из хранилища активных пользователей
      activeUsers.delete(userId);

      // Обновляем статус в базе данных
      await User.updateStatus(userId, 'offline');

      // Уведомляем друзей
      notifyFriendsStatusChange(userId, 'offline');

      // Очищаем комнаты пользователя
      socket.leave(`user:${userId}`);
      socket.leave(`user_chats:${userId}`);
    });
  });

  return io;
};

/**
 * Уведомление друзей об изменении статуса
 */
const notifyFriendsStatusChange = async (userId, status) => {
  try {
    // Здесь должна быть логика получения друзей/контактов пользователя
    // Для MVP отправляем всем активным пользователям
    activeUsers.forEach((userData, otherUserId) => {
      if (otherUserId !== userId) {
        io.to(`user:${otherUserId}`).emit('friend_status_change', {
          userId,
          status,
          timestamp: new Date()
        });
      }
    });
  } catch (error) {
    console.error('Ошибка уведомления друзей:', error);
  }
};

/**
 * Получение экземпляра Socket.io
 */
const getIo = () => {
  if (!io) {
    throw new Error('Socket.io не инициализирован');
  }
  return io;
};

/**
 * Получение списка активных пользователей
 */
const getActiveUsers = () => {
  return Array.from(activeUsers.values()).map(data => ({
    ...data.user,
    socketId: data.socketId,
    connectedAt: data.connectedAt
  }));
};

/**
 * Отправка сообщения конкретному пользователю
 */
const sendToUser = (userId, event, data) => {
  const userData = activeUsers.get(userId);
  if (userData) {
    io.to(userData.socketId).emit(event, data);
    return true;
  }
  return false;
};

/**
 * Отправка сообщения всем пользователям в чате
 */
const sendToChat = async (chatId, event, data) => {
  try {
    const chat = await Chat.getById(chatId);
    const participants = chat.participants || [];

    participants.forEach(participant => {
      sendToUser(participant.id, event, data);
    });

    return true;
  } catch (error) {
    console.error('Ошибка отправки сообщения в чат:', error);
    return false;
  }
};

module.exports = {
  initSocket,
  getIo,
  getActiveUsers,
  sendToUser,
  sendToChat
};