// Модель сообщений
const pool = require('../config/database');

class Message {
  // Создание нового сообщения
  static async create({
    chat_id,
    sender_id,
    content,
    message_type = 'text',
    metadata = {},
    reply_to = null
  }) {
    try {
      const query = `
        INSERT INTO messages (
          chat_id, 
          sender_id, 
          content, 
          message_type, 
          metadata, 
          reply_to, 
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      const values = [chat_id, sender_id, content, message_type, metadata, reply_to];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка создания сообщения: ${error.message}`);
    }
  }

  // Получение сообщений чата
  static async getByChatId(chatId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT 
          m.*,
          u.username as sender_username,
          u.avatar_url as sender_avatar,
          r.content as reply_content,
          ru.username as reply_sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        LEFT JOIN messages r ON m.reply_to = r.id
        LEFT JOIN users ru ON r.sender_id = ru.id
        WHERE m.chat_id = $1
        ORDER BY m.sent_at ASC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [chatId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка получения сообщений: ${error.message}`);
    }
  }

  // Получение сообщения по ID
  static async getById(messageId) {
    try {
      const query = `
        SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.id = $1
      `;
      const result = await pool.query(query, [messageId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка получения сообщения: ${error.message}`);
    }
  }

  // Обновление сообщения
  static async update(messageId, content, metadata = {}) {
    try {
      const query = `
        UPDATE messages 
        SET content = $1, metadata = $2, edited_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const result = await pool.query(query, [content, metadata, messageId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления сообщения: ${error.message}`);
    }
  }

  // Удаление сообщения
  static async delete(messageId) {
    try {
      const query = `
        UPDATE messages 
        SET deleted = true, deleted_at = NOW()
        WHERE id = $1
        RETURNING id
      `;
      const result = await pool.query(query, [messageId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка удаления сообщения: ${error.message}`);
    }
  }

  // Отметка сообщений как прочитанных
  static async markAsRead(messageIds, userId) {
    try {
      const query = `
        UPDATE messages 
        SET read_by = array_append(read_by, $1)
        WHERE id = ANY($2) AND NOT read_by @> ARRAY[$1]
        RETURNING id
      `;
      const result = await pool.query(query, [userId, messageIds]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка отметки прочитанных: ${error.message}`);
    }
  }

  // Получение количества непрочитанных сообщений
  static async getUnreadCount(chatId, userId) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM messages 
        WHERE chat_id = $1 
        AND sender_id != $2
        AND NOT read_by @> ARRAY[$2]
        AND NOT deleted
      `;
      const result = await pool.query(query, [chatId, userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Ошибка подсчета непрочитанных: ${error.message}`);
    }
  }

  // Поиск сообщений по содержанию
  static async searchInChat(chatId, searchTerm, limit = 20) {
    try {
      const query = `
        SELECT m.*, u.username as sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.chat_id = $1 
        AND m.content ILIKE $2
        AND NOT m.deleted
        ORDER BY m.sent_at DESC
        LIMIT $3
      `;
      const result = await pool.query(query, [chatId, `%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка поиска сообщений: ${error.message}`);
    }
  }

  // Получение последнего сообщения чата
  static async getLastMessage(chatId) {
    try {
      const query = `
        SELECT m.*, u.username as sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.chat_id = $1 AND NOT m.deleted
        ORDER BY m.sent_at DESC
        LIMIT 1
      `;
      const result = await pool.query(query, [chatId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка получения последнего сообщения: ${error.message}`);
    }
  }
}

module.exports = Message;