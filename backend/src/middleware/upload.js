// Middleware для загрузки файлов
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директорию для загрузок, если она не существует
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для загружаемых файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadDir;
    
    // Создаем поддиректории в зависимости от типа файла
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(uploadDir, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = path.join(uploadDir, 'videos');
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath = path.join(uploadDir, 'audio');
    } else {
      uploadPath = path.join(uploadDir, 'documents');
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Фильтр файлов по MIME типам
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedMimeTypes = [
    // Изображения
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Документы
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    // Аудио
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Видео
    'video/mp4',
    'video/mpeg',
    'video/ogg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла'), false);
  }
};

// Настройки загрузки
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
    files: 1 // Максимум 1 файл за раз
  }
});

/**
 * Middleware для обработки ошибок загрузки файлов
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Ошибки Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Файл слишком большой. Максимальный размер: 10MB'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Можно загружать только один файл за раз'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `Ошибка загрузки файла: ${err.message}`
    });
  } else if (err) {
    // Другие ошибки
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

/**
 * Middleware для валидации загружаемых изображений (аватаров)
 */
const validateAvatar = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedImageTypes.includes(req.file.mimetype)) {
    // Удаляем загруженный файл, если он не является изображением
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'Аватар должен быть изображением (JPEG, PNG, GIF, WebP)'
    });
  }

  // Проверяем размер изображения (максимум 5MB для аватаров)
  if (req.file.size > 5 * 1024 * 1024) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'Аватар слишком большой. Максимальный размер: 5MB'
    });
  }

  next();
};

/**
 * Middleware для валидации загружаемых файлов для сообщений
 */
const validateMessageFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Проверяем размер файла
  if (req.file.size > 10 * 1024 * 1024) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: 'Файл слишком большой. Максимальный размер: 10MB'
    });
  }

  next();
};

/**
 * Функция для удаления файла
 */
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  upload,
  handleUploadError,
  validateAvatar,
  validateMessageFile,
  deleteFile
};