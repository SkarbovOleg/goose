// Контроллер аутентификации
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Chat = require('../models/Chat');

// Генерация JWT токена
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'goose_secret_key_2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Контроллер регистрации
exports.register = async (req, res) => {
  try {
    // Валидация входящих данных
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { username, email, password, avatar_url } = req.body;

    // Проверка уникальности email
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email уже используется'
      });
    }

    // Проверка уникальности username
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Имя пользователя уже занято'
      });
    }

    // Создание пользователя
    const user = await User.create({ 
      username, 
      email, 
      password, 
      avatar_url 
    });

    // Генерация токена
    const token = generateToken(user.id);

    // Обновление статуса
    await User.updateStatus(user.id, 'online');

    res.status(201).json({
      success: true,
      message: 'Регистрация успешна',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          status: 'online',
          created_at: user.created_at
        },
        token
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Контроллер входа
exports.login = async (req, res) => {
  try {
    // Валидация
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Проверка пароля
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Генерация токена
    const token = generateToken(user.id);

    // Обновление статуса
    await User.updateStatus(user.id, 'online');

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          status: 'online',
          last_seen: user.last_seen
        },
        token
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при входе',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Контроллер выхода
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Обновление статуса
    await User.updateStatus(userId, 'offline');

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });

  } catch (error) {
    console.error('Ошибка выхода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при выходе'
    });
  }
};

// Контроллер получения профиля
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении профиля'
    });
  }
};

// Контроллер обновления профиля
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Удаляем поля, которые нельзя обновлять
    delete updates.id;
    delete updates.password_hash;
    delete updates.created_at;

    // Если есть username, проверяем уникальность
    if (updates.username) {
      const existingUser = await User.findByUsername(updates.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Имя пользователя уже занято'
        });
      }
    }

    // Если есть email, проверяем уникальность
    if (updates.email) {
      const existingUser = await User.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email уже используется'
        });
      }
    }

    // Обновляем пользователя
    const updatedUser = await User.update(userId, updates);

    res.json({
      success: true,
      message: 'Профиль обновлен',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении профиля'
    });
  }
};

// Контроллер смены пароля
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Получаем пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверяем текущий пароль
    const isPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Текущий пароль неверен'
      });
    }

    // Обновляем пароль
    await User.updatePassword(userId, newPassword);

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при смене пароля'
    });
  }
};

// Контроллер обновления статуса
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;

    // Проверяем допустимые статусы
    const validStatuses = ['online', 'offline', 'away', 'busy', 'invisible'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный статус'
      });
    }

    // Обновляем статус
    const updatedUser = await User.updateStatus(userId, status);

    res.json({
      success: true,
      message: 'Статус обновлен',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении статуса'
    });
  }
};

// Контроллер поиска пользователей
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: { users: [] }
      });
    }

    const users = await User.search(query, currentUserId);

    res.json({
      success: true,
      data: { users }
    });

  } catch (error) {
    console.error('Ошибка поиска пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске пользователей'
    });
  }
};

// Валидаторы для express-validator
exports.validateRegister = [
  require('express-validator').body('username')
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  
  require('express-validator').body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email'),
  
  require('express-validator').body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
];

exports.validateLogin = [
  require('express-validator').body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email'),
  
  require('express-validator').body('password')
    .notEmpty().withMessage('Пароль обязателен')
];