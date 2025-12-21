// Middleware для аутентификации
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware для проверки JWT токена
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Получаем токен из заголовков
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Токен доступа не предоставлен'
      });
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goose_secret_key_2024');
    
    // Находим пользователя
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Добавляем пользователя в объект запроса
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      status: user.status
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Неверный токен'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Токен истек'
      });
    }

    console.error('Ошибка аутентификации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка аутентификации'
    });
  }
};

/**
 * Middleware для проверки ролей пользователя
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // В будущем можно добавить проверку ролей
    // Для MVP всегда разрешаем доступ
    next();
  };
};

/**
 * Middleware для проверки владения ресурсом
 */
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id || req.params[`${resourceType}Id`];

      // В будущем можно добавить проверку владения ресурсом
      // Для MVP всегда разрешаем доступ, если пользователь авторизован
      next();
    } catch (error) {
      console.error('Ошибка проверки владения:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки прав доступа'
      });
    }
  };
};

/**
 * Middleware для проверки доступа к чату
 */
const checkChatAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    // Импортируем модель Chat здесь, чтобы избежать циклических зависимостей
    const Chat = require('../models/Chat');
    const hasAccess = await Chat.hasAccess(chatId, userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату'
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки доступа к чату:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки доступа'
    });
  }
};

/**
 * Middleware для проверки, что пользователь является автором сообщения
 */
const checkMessageOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.messageId;

    // Импортируем модель Message здесь
    const Message = require('../models/Message');
    const message = await Message.getById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения действия'
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки прав на сообщение:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};

/**
 * Middleware для проверки административных прав в чате
 */
const checkChatAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    // Импортируем модель Chat здесь
    const Chat = require('../models/Chat');
    const chat = await Chat.getById(chatId, userId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    const userRole = chat.participants?.find(p => p.id === userId)?.role;
    const isCreator = chat.created_by === userId;

    if (userRole !== 'admin' && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может выполнять это действие'
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки админских прав:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки прав доступа'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkOwnership,
  checkChatAccess,
  checkMessageOwnership,
  checkChatAdmin
};