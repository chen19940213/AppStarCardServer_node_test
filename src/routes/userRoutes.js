const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// 用户登录
router.post('/login', UserController.login);

// 获取用户信息（需要认证）
router.get('/info', authenticateToken, UserController.getUserInfo);

// 更新用户信息（需要认证）
router.post('/update', authenticateToken, UserController.updateUserInfo);

module.exports = router;

