const express = require('express');
const router = express.Router();
const AppraisalController = require('../controllers/appraisalController');
const { authenticateToken } = require('../middleware/auth');

// 所有鉴定接口都需要认证
router.use(authenticateToken);

// 创建鉴定记录
router.post('/create', AppraisalController.create);

// 获取鉴定记录列表
router.get('/list', AppraisalController.getList);

// 获取鉴定记录详情
router.get('/detail/:id', AppraisalController.getDetail);

// 删除鉴定记录
router.delete('/delete/:id', AppraisalController.delete);

module.exports = router;

