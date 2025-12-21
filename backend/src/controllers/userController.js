// Контроллер пользователей (дополнительные функции)
const User = require('../models/User');

// Получение информации о пользователе по ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Не показываем скрытую информацию другим пользователям
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Для запроса самого себя возвращаем полную информацию
    if (userId === currentUserId) {
      return res.json({
        success: true,
        data: { user }
      });
    }

    // Для других пользователей возвращаем только публичную информацию
    const publicUserInfo = {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      status: user.status,
      created_at: user.created_at
    };

    res.json({
      success: true,
      data: { user: publicUserInfo }
    });

  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации о пользователе'
    });
  }
};

// Обновление аватара пользователя
exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не загружен'
      });
    }

    // В реальном приложении здесь должна быть логика загрузки в облачное хранилище
    // Для примера используем локальный путь
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Обновляем аватар в базе данных
    const updatedUser = await User.updateAvatar(userId, avatarUrl);

    res.json({
      success: true,
      message: 'Аватар обновлен',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Ошибка обновления аватара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении аватара'
    });
  }
};

// Получение онлайн статусов пользователей
exports.getUsersStatus = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Укажите ID пользователей'
      });
    }

    // Ограничиваем количество запрашиваемых статусов
    const limitedIds = userIds.slice(0, 100);
    
    const statuses = [];
    for (const userId of limitedIds) {
      const user = await User.findById(userId);
      if (user) {
        statuses.push({
          id: user.id,
          username: user.username,
          status: user.status,
          last_seen: user.last_seen
        });
      }
    }

    res.json({
      success: true,
      data: { statuses }
    });

  } catch (error) {
    console.error('Ошибка получения статусов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статусов пользователей'
    });
  }
};

// Получение списка контактов (пользователей, с которыми есть чаты)
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // В реальном приложении здесь должна быть логика получения контактов
    // Для MVP просто возвращаем всех пользователей, кроме текущего
    const contacts = await User.getAll(100, 0);
    const filteredContacts = contacts.filter(user => user.id !== userId);

    res.json({
      success: true,
      data: { contacts: filteredContacts }
    });

  } catch (error) {
    console.error('Ошибка получения контактов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка контактов'
    });
  }
};

// Блокировка пользователя (дополнительная функция)
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя заблокировать самого себя'
      });
    }

    // Проверяем существование пользователя
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // В реальном приложении здесь должна быть логика блокировки
    // Для MVP просто возвращаем успешный ответ
    res.json({
      success: true,
      message: 'Пользователь заблокирован'
    });

  } catch (error) {
    console.error('Ошибка блокировки пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при блокировке пользователя'
    });
  }
};

// Разблокировка пользователя
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Проверяем существование пользователя
    const userToUnblock = await User.findById(userId);
    if (!userToUnblock) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // В реальном приложении здесь должна быть логика разблокировки
    // Для MVP просто возвращаем успешный ответ
    res.json({
      success: true,
      message: 'Пользователь разблокирован'
    });

  } catch (error) {
    console.error('Ошибка разблокировки пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при разблокировке пользователя'
    });
  }
};

// Получение списка заблокированных пользователей
exports.getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    // В реальном приложении здесь должна быть логика получения заблокированных пользователей
    // Для MVP возвращаем пустой массив
    res.json({
      success: true,
      data: { blockedUsers: [] }
    });

  } catch (error) {
    console.error('Ошибка получения заблокированных пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка заблокированных пользователей'
    });
  }
};

// Изменение настроек уведомлений (заглушка для будущей реализации)
exports.updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    // В реальном приложении здесь должна быть логика сохранения настроек
    // Для MVP просто возвращаем успешный ответ
    res.json({
      success: true,
      message: 'Настройки уведомлений обновлены',
      data: { settings }
    });

  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении настроек уведомлений'
    });
  }
};

// Получение статистики пользователя (для админа или самого пользователя)
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Только сам пользователь может видеть свою статистику
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к статистике другого пользователя'
      });
    }

    // В реальном приложении здесь должна быть сложная логика сбора статистики
    // Для MVP возвращаем базовую информацию
    const user = await User.findById(userId);
    
    const stats = {
      user_id: user.id,
      username: user.username,
      registration_date: user.created_at,
      status: user.status,
      last_seen: user.last_seen,
      total_chats: 0, // Заглушка
      total_messages: 0, // Заглушка
      online_hours: 0 // Заглушка
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики пользователя'
    });
  }
};