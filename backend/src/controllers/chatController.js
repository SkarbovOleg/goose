// Контроллер чатов и сообщений
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Создание приватного чата
exports.createPrivateChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Проверка существования пользователя
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка, не пытаемся ли создать чат с самим собой
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя создать чат с самим собой'
      });
    }

    // Создание или получение существующего чата
    const result = await Chat.createPrivate(currentUserId, userId);

    if (result.exists) {
      return res.status(200).json({
        success: true,
        message: 'Чат уже существует',
        data: { chatId: result.chatId }
      });
    }

    // Получаем информацию о созданном чате
    const chat = await Chat.getById(result.chatId, currentUserId);

    res.status(201).json({
      success: true,
      message: 'Чат создан успешно',
      data: { chat }
    });

  } catch (error) {
    console.error('Ошибка создания чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании чата'
    });
  }
};

// Создание группового чата
exports.createGroupChat = async (req, res) => {
  try {
    const { name, avatar_url, userIds } = req.body;
    const creatorId = req.user.id;

    // Проверка названия
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Название группы должно быть не менее 2 символов'
      });
    }

    // Проверка участников (должен быть хотя бы 1 кроме создателя)
    const participants = [creatorId, ...(userIds || [])].filter(
      (id, index, arr) => arr.indexOf(id) === index
    );

    if (participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Добавьте хотя бы одного участника'
      });
    }

    // Проверка существования всех пользователей
    for (const userId of participants) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `Пользователь с ID ${userId} не найден`
        });
      }
    }

    // Создание группового чата
    const chat = await Chat.createGroup(
      creatorId,
      name.trim(),
      avatar_url,
      userIds || []
    );

    // Получаем полную информацию о чате
    const fullChat = await Chat.getById(chat.id, creatorId);

    res.status(201).json({
      success: true,
      message: 'Групповой чат создан успешно',
      data: { chat: fullChat }
    });

  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании группового чата'
    });
  }
};

// Получение списка чатов пользователя
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.getUserChats(userId);

    res.json({
      success: true,
      data: { chats }
    });

  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении чатов'
    });
  }
};

// Получение информации о чате
exports.getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Проверка доступа к чату
    const hasAccess = await Chat.hasAccess(chatId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату'
      });
    }

    // Получение информации о чате
    const chat = await Chat.getById(chatId, userId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    res.json({
      success: true,
      data: { chat }
    });

  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации о чате'
    });
  }
};

// Отправка сообщения
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, message_type = 'text', metadata = {}, reply_to = null } = req.body;
    const senderId = req.user.id;

    // Проверка доступа к чату
    const hasAccess = await Chat.hasAccess(chatId, senderId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату'
      });
    }

    // Проверка содержимого сообщения
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Сообщение не может быть пустым'
      });
    }

    // Проверка reply_to, если указан
    if (reply_to) {
      const repliedMessage = await Message.getById(reply_to);
      if (!repliedMessage || repliedMessage.chat_id !== parseInt(chatId)) {
        return res.status(400).json({
          success: false,
          message: 'Ответ на несуществующее сообщение'
        });
      }
    }

    // Создание сообщения
    const message = await Message.create({
      chat_id: chatId,
      sender_id: senderId,
      content: content.trim(),
      message_type,
      metadata,
      reply_to
    });

    // Обновление времени последнего сообщения в чате
    await Chat.updateLastMessageTime(chatId);

    // Получаем полную информацию о сообщении
    const fullMessage = await Message.getById(message.id);

    res.status(201).json({
      success: true,
      message: 'Сообщение отправлено',
      data: { message: fullMessage }
    });

  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отправке сообщения'
    });
  }
};

// Получение сообщений чата
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0, before = null } = req.query;

    // Проверка доступа к чату
    const hasAccess = await Chat.hasAccess(chatId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату'
      });
    }

    // Получение сообщений
    const messages = await Message.getByChatId(chatId, parseInt(limit), parseInt(offset));

    // Если есть before, фильтруем сообщения
    let filteredMessages = messages;
    if (before) {
      const beforeDate = new Date(before);
      filteredMessages = messages.filter(msg => new Date(msg.sent_at) < beforeDate);
    }

    // Получаем информацию о чате
    const chat = await Chat.getById(chatId, userId);

    res.json({
      success: true,
      data: {
        chat,
        messages: filteredMessages,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: messages.length,
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сообщений'
    });
  }
};

// Редактирование сообщения
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, metadata = {} } = req.body;
    const userId = req.user.id;

    // Получаем сообщение
    const message = await Message.getById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }

    // Проверка, что пользователь - автор сообщения
    if (message.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Нельзя редактировать чужие сообщения'
      });
    }

    // Проверка, что сообщение не удалено
    if (message.deleted) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя редактировать удаленное сообщение'
      });
    }

    // Проверка содержимого
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Сообщение не может быть пустым'
      });
    }

    // Обновление сообщения
    const updatedMessage = await Message.update(messageId, content.trim(), {
      ...message.metadata,
      ...metadata,
      edited: true,
      edit_history: [
        ...(message.metadata.edit_history || []),
        {
          content: message.content,
          edited_at: message.edited_at || message.sent_at
        }
      ]
    });

    // Получаем полную информацию об обновленном сообщении
    const fullMessage = await Message.getById(messageId);

    res.json({
      success: true,
      message: 'Сообщение обновлено',
      data: { message: fullMessage }
    });

  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при редактировании сообщения'
    });
  }
};

// Удаление сообщения
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Получаем сообщение
    const message = await Message.getById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }

    // Проверка доступа (автор или админ чата)
    const isAuthor = message.sender_id === userId;
    const chatInfo = await Chat.getById(message.chat_id, userId);
    const isAdmin = chatInfo.participants?.some(
      p => p.id === userId && p.role === 'admin'
    );

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Нельзя удалять чужие сообщения'
      });
    }

    // Удаление сообщения
    await Message.delete(messageId);

    res.json({
      success: true,
      message: 'Сообщение удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении сообщения'
    });
  }
};

// Отметка сообщений как прочитанных
exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Укажите ID сообщений'
      });
    }

    // Проверяем, что пользователь имеет доступ к чатам этих сообщений
    for (const messageId of messageIds) {
      const message = await Message.getById(messageId);
      if (message) {
        const hasAccess = await Chat.hasAccess(message.chat_id, userId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Нет доступа к одному из чатов'
          });
        }
      }
    }

    // Отмечаем как прочитанные
    const markedMessages = await Message.markAsRead(messageIds, userId);

    res.json({
      success: true,
      message: 'Сообщения отмечены как прочитанные',
      data: { markedCount: markedMessages.length }
    });

  } catch (error) {
    console.error('Ошибка отметки прочитанных:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отметке сообщений'
    });
  }
};

// Обновление информации о чате
exports.updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Проверка доступа и роли пользователя
    const chatInfo = await Chat.getById(chatId, userId);
    if (!chatInfo) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    // Проверяем, что пользователь является админом
    const userRole = chatInfo.participants?.find(p => p.id === userId)?.role;
    if (userRole !== 'admin' && chatInfo.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может изменять настройки чата'
      });
    }

    // Удаляем поля, которые нельзя обновлять
    delete updates.id;
    delete updates.created_at;
    delete updates.type;
    delete updates.created_by;

    // Обновляем чат
    const updatedChat = await Chat.update(chatId, updates);

    res.json({
      success: true,
      message: 'Чат обновлен',
      data: { chat: updatedChat }
    });

  } catch (error) {
    console.error('Ошибка обновления чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении чата'
    });
  }
};

// Добавление пользователя в групповой чат
exports.addUserToChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, role = 'member' } = req.body;
    const currentUserId = req.user.id;

    // Проверяем, что чат существует и является групповым
    const chatInfo = await Chat.getById(chatId);
    if (!chatInfo) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    if (chatInfo.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Пользователей можно добавлять только в групповые чаты'
      });
    }

    // Проверяем права текущего пользователя
    const currentUserRole = chatInfo.participants?.find(p => p.id === currentUserId)?.role;
    if (currentUserRole !== 'admin' && chatInfo.created_by !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может добавлять пользователей'
      });
    }

    // Проверяем существование добавляемого пользователя
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь для добавления не найден'
      });
    }

    // Проверяем, не добавлен ли уже пользователь
    const isAlreadyAdded = chatInfo.participants?.some(p => p.id === userId);
    if (isAlreadyAdded) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже добавлен в чат'
      });
    }

    // Добавляем пользователя
    await Chat.addUser(chatId, userId, role);

    // Получаем обновленную информацию о чате
    const updatedChat = await Chat.getById(chatId, currentUserId);

    res.json({
      success: true,
      message: 'Пользователь добавлен в чат',
      data: { chat: updatedChat }
    });

  } catch (error) {
    console.error('Ошибка добавления пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении пользователя в чат'
    });
  }
};

// Удаление пользователя из группового чата
exports.removeUserFromChat = async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const currentUserId = req.user.id;

    // Проверяем, что чат существует и является групповым
    const chatInfo = await Chat.getById(chatId);
    if (!chatInfo) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    if (chatInfo.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Пользователей можно удалять только из групповых чатов'
      });
    }

    // Проверяем права текущего пользователя
    const currentUserRole = chatInfo.participants?.find(p => p.id === currentUserId)?.role;
    const isCreator = chatInfo.created_by === currentUserId;
    
    // Админ или создатель может удалять
    if (currentUserRole !== 'admin' && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Только администратор может удалять пользователей'
      });
    }

    // Нельзя удалить создателя
    if (userId === chatInfo.created_by) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить создателя чата'
      });
    }

    // Нельзя удалить себя, если ты не создатель
    if (userId === currentUserId && !isCreator) {
      return res.status(400).json({
        success: false,
        message: 'Чтобы выйти из чата, используйте функцию "Покинуть чат"'
      });
    }

    // Удаляем пользователя
    await Chat.removeUser(chatId, userId);

    // Если пользователь удаляет себя - возвращаем минимальную информацию
    if (userId === currentUserId) {
      return res.json({
        success: true,
        message: 'Вы покинули чат'
      });
    }

    // Получаем обновленную информацию о чате
    const updatedChat = await Chat.getById(chatId, currentUserId);

    res.json({
      success: true,
      message: 'Пользователь удален из чата',
      data: { chat: updatedChat }
    });

  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении пользователя из чат'
    });
  }
};

// Поиск в чатах
exports.searchChats = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: { chats: [] }
      });
    }

    const chats = await Chat.search(userId, query);

    res.json({
      success: true,
      data: { chats }
    });

  } catch (error) {
    console.error('Ошибка поиска чатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске чатов'
    });
  }
};

// Поиск сообщений в чате
exports.searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query } = req.query;
    const userId = req.user.id;

    // Проверка доступа к чату
    const hasAccess = await Chat.hasAccess(chatId, userId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к чату'
      });
    }

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: { messages: [] }
      });
    }

    const messages = await Message.searchInChat(chatId, query);

    res.json({
      success: true,
      data: { messages }
    });

  } catch (error) {
    console.error('Ошибка поиска сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске сообщений'
    });
  }
};