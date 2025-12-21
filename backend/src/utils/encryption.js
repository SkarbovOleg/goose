// Утилиты для шифрования
const crypto = require('crypto');

/**
 * Конфигурация шифрования
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 бит для AES-256
const IV_LENGTH = 16; // 128 бит для GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Генерация ключа шифрования
 * @param {string} password - Пароль для генерации ключа
 * @param {Buffer} salt - Соль для генерации ключа
 * @returns {Promise<Buffer>} - Сгенерированный ключ
 */
const generateKey = (password, salt) => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey);
    });
  });
};

/**
 * Генерация случайной соли
 * @param {number} length - Длина соли в байтах
 * @returns {Buffer} - Сгенерированная соль
 */
const generateSalt = (length = 16) => {
  return crypto.randomBytes(length);
};

/**
 * Генерация случайного вектора инициализации (IV)
 * @returns {Buffer} - Сгенерированный IV
 */
const generateIV = () => {
  return crypto.randomBytes(IV_LENGTH);
};

/**
 * Шифрование данных
 * @param {string|Buffer} data - Данные для шифрования
 * @param {string} password - Пароль для шифрования
 * @returns {Promise<string>} - Зашифрованные данные в формате base64
 */
const encrypt = async (data, password) => {
  try {
    // Генерируем соль и IV
    const salt = generateSalt();
    const iv = generateIV();
    
    // Генерируем ключ из пароля и соли
    const key = await generateKey(password, salt);
    
    // Создаем шифр
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    // Шифруем данные
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Получаем аутентификационный тег
    const authTag = cipher.getAuthTag();
    
    // Объединяем все компоненты: соль + IV + authTag + encryptedData
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');
    
    return result;
  } catch (error) {
    console.error('Ошибка шифрования:', error);
    throw new Error('Ошибка при шифровании данных');
  }
};

/**
 * Расшифровка данных
 * @param {string} encryptedData - Зашифрованные данные в формате base64
 * @param {string} password - Пароль для расшифровки
 * @returns {Promise<string>} - Расшифрованные данные
 */
const decrypt = async (encryptedData, password) => {
  try {
    // Декодируем из base64
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Извлекаем компоненты
    const salt = buffer.slice(0, 16);
    const iv = buffer.slice(16, 32);
    const authTag = buffer.slice(32, 48);
    const encrypted = buffer.slice(48);
    
    // Генерируем ключ
    const key = await generateKey(password, salt);
    
    // Создаем дешифратор
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Расшифровываем данные
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Ошибка расшифровки:', error);
    if (error.message.includes('auth tag')) {
      throw new Error('Неверный пароль или поврежденные данные');
    }
    throw new Error('Ошибка при расшифровке данных');
  }
};

/**
 * Хеширование данных с использованием SHA-256
 * @param {string} data - Данные для хеширования
 * @param {string} salt - Соль (опционально)
 * @returns {string} - Хеш в формате hex
 */
const hash = (data, salt = '') => {
  const hash = crypto.createHash('sha256');
  hash.update(data + salt);
  return hash.digest('hex');
};

/**
 * Сравнение хешей (защита от timing attack)
 * @param {string} hash1 - Первый хеш
 * @param {string} hash2 - Второй хеш
 * @returns {boolean} - true если хеши совпадают
 */
const compareHashes = (hash1, hash2) => {
  return crypto.timingSafeEqual(
    Buffer.from(hash1, 'hex'),
    Buffer.from(hash2, 'hex')
  );
};

/**
 * Генерация случайной строки
 * @param {number} length - Длина строки
 * @returns {string} - Случайная строка
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Создание HMAC подписи
 * @param {string} data - Данные для подписи
 * @param {string} secret - Секретный ключ
 * @returns {string} - HMAC подпись
 */
const createHmac = (data, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
};

/**
 * Проверка HMAC подписи
 * @param {string} data - Данные
 * @param {string} signature - Подпись для проверки
 * @param {string} secret - Секретный ключ
 * @returns {boolean} - true если подпись верна
 */
const verifyHmac = (data, signature, secret) => {
  const expectedSignature = createHmac(data, secret);
  return compareHashes(signature, expectedSignature);
};

/**
 * Шифрование данных с использованием публичного ключа (RSA)
 * @param {string} data - Данные для шифрования
 * @param {string} publicKey - Публичный ключ в формате PEM
 * @returns {string} - Зашифрованные данные в base64
 */
const encryptWithPublicKey = (data, publicKey) => {
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  );
  return encrypted.toString('base64');
};

/**
 * Расшифровка данных с использованием приватного ключа (RSA)
 * @param {string} encryptedData - Зашифрованные данные в base64
 * @param {string} privateKey - Приватный ключ в формате PEM
 * @returns {string} - Расшифрованные данные
 */
const decryptWithPrivateKey = (encryptedData, privateKey) => {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  );
  return decrypted.toString('utf8');
};

/**
 * Генерация пары RSA ключей
 * @returns {Promise<{publicKey: string, privateKey: string}>} - Публичный и приватный ключи
 */
const generateRSAKeyPair = () => {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      resolve({ publicKey, privateKey });
    });
  });
};

/**
 * Шифрование сообщения для end-to-end
 * @param {Object} message - Сообщение для шифрования
 * @param {string} recipientPublicKey - Публичный ключ получателя
 * @returns {Promise<{encryptedMessage: string, encryptionKey: string}>} - Зашифрованное сообщение и ключ
 */
const encryptMessageE2E = async (message, recipientPublicKey) => {
  try {
    // Генерируем случайный симметричный ключ для этого сообщения
    const symmetricKey = generateRandomString(32);
    
    // Шифруем сообщение симметричным ключом
    const encryptedMessage = await encrypt(JSON.stringify(message), symmetricKey);
    
    // Шифруем симметричный ключ публичным ключом получателя
    const encryptedKey = encryptWithPublicKey(symmetricKey, recipientPublicKey);
    
    return {
      encryptedMessage,
      encryptionKey: encryptedKey
    };
  } catch (error) {
    console.error('Ошибка E2E шифрования:', error);
    throw new Error('Ошибка при шифровании сообщения');
  }
};

/**
 * Расшифровка end-to-end сообщения
 * @param {string} encryptedMessage - Зашифрованное сообщение
 * @param {string} encryptedKey - Зашифрованный симметричный ключ
 * @param {string} privateKey - Приватный ключ получателя
 * @returns {Promise<Object>} - Расшифрованное сообщение
 */
const decryptMessageE2E = async (encryptedMessage, encryptedKey, privateKey) => {
  try {
    // Расшифровываем симметричный ключ
    const symmetricKey = decryptWithPrivateKey(encryptedKey, privateKey);
    
    // Расшифровываем сообщение
    const decryptedMessage = await decrypt(encryptedMessage, symmetricKey);
    
    return JSON.parse(decryptedMessage);
  } catch (error) {
    console.error('Ошибка E2E расшифровки:', error);
    throw new Error('Ошибка при расшифровке сообщения');
  }
};

module.exports = {
  // Базовые функции шифрования
  encrypt,
  decrypt,
  hash,
  compareHashes,
  generateRandomString,
  createHmac,
  verifyHmac,
  
  // RSA функции
  encryptWithPublicKey,
  decryptWithPrivateKey,
  generateRSAKeyPair,
  
  // E2E функции
  encryptMessageE2E,
  decryptMessageE2E,
  
  // Константы
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH
};