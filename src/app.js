const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const appraisalRoutes = require('./routes/appraisalRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// 路由
app.use('/api/user', userRoutes);
app.use('/api/appraisal', appraisalRoutes);
app.use('/api/upload', uploadRoutes);

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
});

