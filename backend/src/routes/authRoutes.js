// Роуты аутентификации
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Публичные роуты
router.post(
  '/register',
  authController.validateRegister,
  authController.register
);

router.post(
  '/login',
  authController.validateLogin,
  authController.login
);

// Защищенные роуты
router.use(authenticateToken);

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/status', authController.updateStatus);
router.get('/users/search', authController.searchUsers);
router.put('/change-password', authController.changePassword);

module.exports = router;