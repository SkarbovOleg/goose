// Роуты чатов и сообщений
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Все роуты требуют аутентификации
router.use(authenticateToken);

// Роуты чатов
router.post('/chats/private', chatController.createPrivateChat);
router.post('/chats/group', chatController.createGroupChat);
router.get('/chats', chatController.getUserChats);
router.get('/chats/search', chatController.searchChats);
router.get('/chats/:chatId', chatController.getChat);
router.put('/chats/:chatId', chatController.updateChat);

// Роуты участников чатов
router.post('/chats/:chatId/users', chatController.addUserToChat);
router.delete('/chats/:chatId/users/:userId', chatController.removeUserFromChat);

// Роуты сообщений
router.post('/chats/:chatId/messages', chatController.sendMessage);
router.get('/chats/:chatId/messages', chatController.getMessages);
router.get('/chats/:chatId/messages/search', chatController.searchMessages);
router.put('/messages/:messageId', chatController.editMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);
router.post('/messages/mark-read', chatController.markAsRead);

module.exports = router;