// Главный серверный файл
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Импорт роутов
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

// Создание Express приложения
const app = express();
const PORT = process.env.PORT || 5000;

// Создание директории для логов, если её нет
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Создание потока для записи логов
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Middleware для логирования
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// Middleware для безопасности
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Middleware для CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ограничение скорости запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: {
    success: false,
    message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Middleware для парсинга JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Обслуживание статических файлов
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/docs', express.static(path.join(__dirname, '../../docs')));

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);
app.use('/api', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Goose Messenger API работает',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API документация
app.get('/api/docs', (req, res) => {
  const docs = {
    message: 'Goose Messenger API Documentation',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile'
      },
      chats: {
        list: 'GET /api/chats',
        createPrivate: 'POST /api/chats/private',
        createGroup: 'POST /api/chats/group',
        getChat: 'GET /api/chats/:chatId',
        updateChat: 'PUT /api/chats/:chatId'
      },
      messages: {
        send: 'POST /api/chats/:chatId/messages',
        list: 'GET /api/chats/:chatId/messages',
        edit: 'PUT /api/messages/:messageId',
        delete: 'DELETE /api/messages/:messageId'
      },
      users: {
        getUser: 'GET /api/users/:userId',
        search: 'GET /api/auth/users/search',
        contacts: 'GET /api/contacts'
      }
    },
    websocket: {
      events: {
        send_message: 'Отправка сообщения',
        new_message: 'Получение нового сообщения',
        message_read: 'Сообщение прочитано',
        user_typing: 'Пользователь печатает',
        friend_status_change: 'Изменение статуса друга'
      }
    }
  };
  
  res.json(docs);
});

// Обработка 404 ошибок
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Эндпоинт не найден',
    path: req.path
  });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Глобальная ошибка:', err.stack);
  
  // Запись ошибки в лог файл
  const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
  );
  errorLogStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Внутренняя ошибка сервера'
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`🚀 Goose Messenger API запущен на порту ${PORT}`);
  console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Документация: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Инициализация Socket.io
const { initSocket } = require('./config/socket');
initSocket(server);

// Обработка завершения работы
process.on('SIGTERM', () => {
  console.log('SIGTERM получен, завершение работы...');
  server.close(() => {
    console.log('Сервер завершил работу');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT получен, завершение работы...');
  server.close(() => {
    console.log('Сервер завершил работу');
    process.exit(0);
  });
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанный промис:', promise, 'причина:', reason);
});

module.exports = app;