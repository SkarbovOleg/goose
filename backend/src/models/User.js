const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Создание нового пользователя
  static async create({ username, email, password, avatar_url = null }) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `
        INSERT INTO users (username, email, password_hash, avatar_url, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, username, email, avatar_url, status, created_at
      `;
      const values = [username, email, hashedPassword, avatar_url];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка создания пользователя: ${error.message}`);
    }
  }

  // Поиск пользователя по email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка поиска пользователя: ${error.message}`);
    }
  }

  // Поиск пользователя по ID
  static async findById(id) {
    try {
      const query = `
        SELECT id, username, email, avatar_url, status, created_at, last_seen
        FROM users WHERE id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка поиска пользователя: ${error.message}`);
    }
  }

  // Поиск пользователя по имени пользователя
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка поиска пользователя: ${error.message}`);
    }
  }

  // Обновление статуса пользователя
  static async updateStatus(userId, status) {
    try {
      const query = `
        UPDATE users 
        SET status = $1, last_seen = NOW()
        WHERE id = $2 
        RETURNING id, username, status, last_seen
      `;
      const result = await pool.query(query, [status, userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления статуса: ${error.message}`);
    }
  }

  // Поиск пользователей по запросу
  static async search(query, currentUserId, limit = 20) {
    try {
      const searchQuery = `
        SELECT id, username, email, avatar_url, status
        FROM users 
        WHERE (username ILIKE $1 OR email ILIKE $1)
        AND id != $2
        ORDER BY username
        LIMIT $3
      `;
      const result = await pool.query(searchQuery, [`%${query}%`, currentUserId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка поиска пользователей: ${error.message}`);
    }
  }

  // Обновление аватара
  static async updateAvatar(userId, avatarUrl) {
    try {
      const query = `
        UPDATE users 
        SET avatar_url = $1 
        WHERE id = $2 
        RETURNING id, username, avatar_url
      `;
      const result = await pool.query(query, [avatarUrl, userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления аватара: ${error.message}`);
    }
  }

  // Проверка пароля
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Ошибка проверки пароля: ${error.message}`);
    }
  }

  // Удаление пользователя
  static async delete(userId) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка удаления пользователя: ${error.message}`);
    }
  }

  // Получение всех пользователей (для админа)
  static async getAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT id, username, email, avatar_url, status, created_at
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      throw new Error(`Ошибка получения пользователей: ${error.message}`);
    }
  }

  // Обновление пользователя
  static async update(userId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'password_hash' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('Нет полей для обновления');
      }

      values.push(userId);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, email, avatar_url, status
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления пользователя: ${error.message}`);
    }
  }

  // Обновление пароля
  static async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const query = `
        UPDATE users 
        SET password_hash = $1 
        WHERE id = $2 
        RETURNING id
      `;
      const result = await pool.query(query, [hashedPassword, userId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Ошибка обновления пароля: ${error.message}`);
    }
  }
}

module.exports = User;
