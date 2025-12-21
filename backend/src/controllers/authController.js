const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// ... существующий код ...

// Валидаторы для express-validator
exports.validateRegister = [
  body('username')
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  
  body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
];

exports.validateLogin = [
  body('email')
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
];
