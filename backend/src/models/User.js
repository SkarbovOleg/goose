const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // ... существующие методы ...

  static async update(userId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      });

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
