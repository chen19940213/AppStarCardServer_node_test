# 星卡鉴定小程序后端服务

## 项目简介
这是星卡鉴定小程序的后端服务，基于 Node.js + Express + MySQL 开发。

## 技术栈
- Node.js 18+
- Express 4.x
- MySQL 8.0+
- JWT 认证
- Multer 文件上传

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env` 文件并修改数据库配置：
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=app_star_card_dev
```

### 3. 创建数据库
```sql
CREATE DATABASE app_star_card_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 启动开发服务器
```bash
npm run dev
```

服务器将运行在 http://localhost:3000

## API 文档

### 用户相关
- `POST /api/user/login` - 用户登录
- `GET /api/user/info` - 获取用户信息
- `POST /api/user/update` - 更新用户信息

### 上传相关
- `POST /api/upload/image` - 上传图片

### 鉴定相关
- `POST /api/appraisal/create` - 创建鉴定记录
- `GET /api/appraisal/list` - 获取鉴定列表
- `GET /api/appraisal/detail/:id` - 获取鉴定详情
- `DELETE /api/appraisal/delete/:id` - 删除鉴定记录

## 项目结构
```
AppStarCardServer_node_test/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── routes/          # 路由
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   └── app.js           # 主应用
├── uploads/             # 上传文件目录
├── .env                 # 环境变量
└── package.json
```

## 部署

### 部署到服务器
```bash
# 1. 推送代码到 Git
git push origin main

# 2. 在服务器上拉取
cd /var/www/AppStarCardServer_node_test
git pull

# 3. 安装依赖
npm install --production

# 4. 使用 PM2 启动
pm2 start src/app.js --name app-star-card
pm2 save
```

## 许可证
MIT

