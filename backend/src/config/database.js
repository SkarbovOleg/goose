// Конфигурация базы данных PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул подключений к базе данных
const pool = new Pool({
  user: process.env.DB_USER || 'goose_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'goose_db',
  password: process.env.DB_PASSWORD || 'goose_password',
  port: process.env.DB_PORT || 5432,
  max: 20, // Максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // Закрыть клиенты, которые простаивают 30 секунд
  connectionTimeoutMillis: 2000, // Время ожидания подключения
});

// Обработчики событий пула
pool.on('connect', () => {
  console.log('✅ Установлено подключение к базе данных PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Неожиданная ошибка подключения к базе данных:', err);
  process.exit(-1);
});

// Функция для выполнения SQL запросов
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 SQL запрос выполнен за ${duration}ms: ${text.substring(0, 100)}...`);
    return res;
  } catch (error) {
    console.error('❌ Ошибка выполнения SQL запроса:', error.message);
    console.error('Запрос:', text);
    throw error;
  }
};

// Функция для получения клиента из пула (для транзакций)
const getClient = async () => {
  const client = await pool.connect();
  
  const query = client.query;
  const release = client.release;
  
  // Устанавливаем таймаут для клиента
  const timeout = setTimeout(() => {
    console.error('⚠️ Клиент базы данных был занят более 10 секунд');
  }, 10000);
  
  // Переопределяем release для очистки таймаута
  client.release = () => {
    clearTimeout(timeout);
    release.apply(client);
  };
  
  return client;
};

// SQL для создания таблиц
const createTablesSQL = `
-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'offline',
  last_seen TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица чатов
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
  name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Таблица участников чатов
CREATE TABLE IF NOT EXISTS chat_users (
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video')),
  metadata JSONB DEFAULT '{}',
  reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  read_by INTEGER[] DEFAULT '{}'
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_user_id ON chat_users(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
`;

// Функция для создания таблиц
const createTables = async () => {
  try {
    await query(createTablesSQL);
    console.log('✅ Таблицы базы данных созданы/проверены');
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error.message);
  }
};

// Инициализация базы данных
createTables();

// Функция для проверки подключения к базе данных
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Подключение к базе данных работает:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    return false;
  }
};

// Функция для получения статистики базы данных
const getDatabaseStats = async () => {
  try {
    const stats = {
      users: 0,
      chats: 0,
      messages: 0,
      connections: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    const usersResult = await query('SELECT COUNT(*) FROM users');
    const chatsResult = await query('SELECT COUNT(*) FROM chats');
    const messagesResult = await query('SELECT COUNT(*) FROM messages WHERE NOT deleted');

    stats.users = parseInt(usersResult.rows[0].count);
    stats.chats = parseInt(chatsResult.rows[0].count);
    stats.messages = parseInt(messagesResult.rows[0].count);

    return stats;
  } catch (error) {
    console.error('❌ Ошибка получения статистики базы данных:', error);
    return null;
  }
};

module.exports = {
  query,
  getClient,
  testConnection,
  getDatabaseStats,
  pool
};