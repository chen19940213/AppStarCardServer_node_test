const express = require('express');
const router = express.Router();
const RouterController = require('../controllers/routerController');

// 测试路由
router.get('/router/test', (req, res) => {
  res.json({ message: '路由测试成功' });
});

// 统一路由入口
// POST /api/router
// Body: { path: "user/login", data: {...}, params: {...} }
router.post('/router', RouterController.route);

console.log('🔧 routerRoutes 已加载，路由路径: /api/router');

module.exports = router;

