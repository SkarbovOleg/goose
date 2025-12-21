// Роуты пользователей
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Все роуты требуют аутентификации
router.use(authenticateToken);

// Получение информации о пользователях
router.get('/users/:userId', userController.getUserById);
router.get('/users/:userId/stats', userController.getUserStats);
router.post('/users/status', userController.getUsersStatus);

// Контакты и блокировки
router.get('/contacts', userController.getContacts);
router.post('/users/:userId/block', userController.blockUser);
router.post('/users/:userId/unblock', userController.unblockUser);
router.get('/blocked-users', userController.getBlockedUsers);

// Настройки профиля
router.post(
  '/profile/avatar',
  upload.single('avatar'),
  userController.updateAvatar
);

router.put(
  '/notification-settings',
  userController.updateNotificationSettings
);

module.exports = router;