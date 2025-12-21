// Модель чатов
const pool = require('../config/database');

class Chat {
  // Создание приватного чата
  static async createPrivate(user1Id, user2Id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Проверяем, существует ли уже чат
      const checkQuery = `
        SELECT c.id 
        FROM chats c
        JOIN chat_users cu1 ON c.id = cu1.chat_id
        JOIN chat_users cu2 ON c.id = cu2.chat_id
        WHERE c.type = 'private'
        AND cu1.user_id = $1
        AND cu2.user_id = $2
      `;
      const existingChat = await client.query(checkQuery, [user1Id, user2Id]);
      
      if (existingChat.rows.length > 0) {
        await client.query('ROLLBACK');
        return { exists: true, chatId: existingChat.rows[0].id };
      }

      // Создаем новый чат
      const createChatQuery = `
        INSERT INTO chats (type, created_at)
        VALUES ('private', NOW())
        RETURNING id
      `;
      const chatResult = await client.query(createChatQuery);
      const chatId = chatResult.rows[0].id;

      // Добавляем участников
      const addUsersQuery = `
        INSERT INTO chat_users (chat_id, user_id, joined_at)
        VALUES ($1, $2, NOW()), ($1, $3, NOW())
      `;
      await client.query(addUsersQuery, [chatId, user1Id, user2Id]);

      await client.query('COMMIT');
      
      return { exists: false, chatId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Ошибка создания чата: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Создание группового чата
  static async createGroup(creatorId, name, avatarUrl = null, userIds = []) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Создаем чат
      const createChatQuery = `
        INSERT INTO chats (type, name, avatar_url, created_by, created_at)
        VALUES ('group', $1, $2, $3, NOW())
        RETURNING id, name, type, avatar_url, created_at
      `;
      const chatResult = await client.query(createChatQuery, [name, avatarUrl, creatorId]);
      const chat = chatResult.rows[0];

      // Добавляем создателя
      const addCreatorQuery = `
        INSERT INTO chat_users (chat_id, user_id, role, joined_at)
        VALUES ($1, $2, 'admin', NOW())
      `;
      await client.query(addCreatorQuery, [chat.id, creatorId]);

      // Добавляем остальных участников
      if (userIds.length > 0) {
        const values = userIds.map((userId, index) => 
          `($1, $${index + 2}, 'member', NOW())`
        ).join(', ');
        
        const addUsersQuery = `
          INSERT INTO chat_users (chat_id, user_id, role, joined_at)
          VALUES ${values}
        `;
        await client.query(addUsersQuery, [chat.id, ...userIds]);
      }

      await client.query('COMMIT');
      
      return chat;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Ошибка создания группового чата: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Получение чатов пользователя
  static async getUserChats(userId) {
    try {
      const query = `
        SELECT 
          c.id,
          c.type,
          c.name,
          c.avatar_url,
          c.created_at,
          c.last_message_at,
          COUNT(DISTINCT cu.user_id) as members_count,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.chat_id = c.id
            AND NOT m.read_by @> ARRAY[$1]
            AND m.sender_id != $1
            AND NOT m.deleted
          ) as unread_count,
          CASE 
            WHEN c.type = 'private' THEN (
              SELECT json_build_object(
                'id', u.id,
                'username', u.username,
                'avatar_url', u.avatar_url,
                'status', u.status
              )
              FROM users u
              JOIN chat_users cu2 ON u.id = cu2.user_id
              WHERE cu2.chat_id = c.id AND u.id != $1
            )
            ELSE null
          END as other_user
        FROM chats c
        JOIN chat_users cu ON c.id = cu.chat_id
        WHERE cu.user_id = $1
        GROUP BY c.id
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка получения чатов: ${error.message}`);
    }
  }

  // Получение информации о чате
  static async getById(chatId, userId = null) {
    try {
      const query = `
        SELECT 
          c.*,
          json_agg(
            json_build_object(
              'id', u.id,
              'username', u.username,
              'avatar_url', u.avatar_url,
              'status', u.status,
              'role', cu.role,
              'joined_at', cu.joined_at
            )
          ) as participants
        FROM chats c
        JOIN chat_users cu ON c.id = cu.chat_id
        JOIN users u ON cu.user_id = u.id
        WHERE c.id = $1
        ${userId ? 'AND cu.user_id = $2' : ''}
        GROUP BY c.id
      `;
      
      const params = userId ? [chatId, userId] : [chatId];
      const result = await pool.query(query, params);
      
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка получения чата: ${error.message}`);
    }
  }

  // Проверка доступа пользователя к чату
  static async hasAccess(chatId, userId) {
    try {
      const query = `
        SELECT 1 FROM chat_users 
        WHERE chat_id = $1 AND user_id = $2
      `;
      const result = await pool.query(query, [chatId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Ошибка проверки доступа: ${error.message}`);
    }
  }

  // Обновление информации о чате
  static async update(chatId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      });

      values.push(chatId);

      const query = `
        UPDATE chats 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления чата: ${error.message}`);
    }
  }

  // Обновление времени последнего сообщения
  static async updateLastMessageTime(chatId) {
    try {
      const query = `
        UPDATE chats 
        SET last_message_at = NOW()
        WHERE id = $1
        RETURNING last_message_at
      `;
      const result = await pool.query(query, [chatId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления времени: ${error.message}`);
    }
  }

  // Добавление пользователя в чат
  static async addUser(chatId, userId, role = 'member') {
    try {
      const query = `
        INSERT INTO chat_users (chat_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (chat_id, user_id) DO NOTHING
        RETURNING user_id
      `;
      const result = await pool.query(query, [chatId, userId, role]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка добавления пользователя: ${error.message}`);
    }
  }

  // Удаление пользователя из чата
  static async removeUser(chatId, userId) {
    try {
      const query = `
        DELETE FROM chat_users 
        WHERE chat_id = $1 AND user_id = $2
        RETURNING user_id
      `;
      const result = await pool.query(query, [chatId, userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка удаления пользователя: ${error.message}`);
    }
  }

  // Удаление чата
  static async delete(chatId) {
    try {
      const query = 'DELETE FROM chats WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [chatId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка удаления чата: ${error.message}`);
    }
  }

  // Поиск чатов
  static async search(userId, searchTerm) {
    try {
      const query = `
        SELECT DISTINCT c.*
        FROM chats c
        JOIN chat_users cu ON c.id = cu.chat_id
        LEFT JOIN users u ON (
          c.type = 'private' 
          AND u.id IN (
            SELECT user_id 
            FROM chat_users 
            WHERE chat_id = c.id AND user_id != $1
          )
        )
        WHERE cu.user_id = $1
        AND (
          c.name ILIKE $2
          OR (c.type = 'private' AND u.username ILIKE $2)
        )
        ORDER BY c.last_message_at DESC NULLS LAST
      `;
      const result = await pool.query(query, [userId, `%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка поиска чатов: ${error.message}`);
    }
  }
}

module.exports = Chat;