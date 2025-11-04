const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const appraisalRoutes = require('./routes/appraisalRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const routerRoutes = require('./routes/routerRoutes');

const app = express();

// 中间件
app.use(cors());
// 增加 body 大小限制以支持 base64 图片上传（10MB 图片 base64 编码后约 13-14MB）
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 创建上传目录
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 统一路由入口（必须在其他 /api/* 路由之前注册）
// 支持 /api 作为统一入口，兼容 action 格式的请求
const RouterController = require('./controllers/routerController');

app.post('/api', (req, res, next) => {
  console.log('🚀 POST /api 路由被触发');
  console.log('🚀 请求体:', JSON.stringify(req.body));
  RouterController.route(req, res).catch(next);
});

// 同时也支持 /api/router 和 /api/route
app.post('/api/router', (req, res, next) => {
  RouterController.route(req, res).catch(next);
});

app.post('/api/route', (req, res, next) => {
  RouterController.route(req, res).catch(next);
});

// 其他路由
app.use('/api/user', userRoutes);
app.use('/api/appraisal', appraisalRoutes);
app.use('/api/upload', uploadRoutes);
console.log('✅ 路由已注册: POST /api/router');

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: -1,
    message: '接口不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: -1,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`📝 API文档:`);
  console.log(`   - POST   /api/user/login           用户登录`);
  console.log(`   - GET    /api/user/info            获取用户信息`);
  console.log(`   - POST   /api/user/update          更新用户信息`);
  console.log(`   - POST   /api/upload/image         上传图片`);
  console.log(`   - POST   /api/appraisal/create     创建鉴定记录`);
  console.log(`   - GET    /api/appraisal/list       获取鉴定列表`);
  console.log(`   - GET    /api/appraisal/detail/:id 获取鉴定详情`);
  console.log(`   - DELETE /api/appraisal/delete/:id 删除鉴定记录`);
  console.log(`   - POST   /api                      统一路由入口（支持action格式）`);
  console.log(`   - POST   /api/router              统一路由入口（支持path格式）`);
});

