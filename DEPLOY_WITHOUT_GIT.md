# 不使用Git的部署方案

## 📋 部署方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
|-----|------|-----|---------|
| SCP直接上传 | 简单快速 | 每次都要全量上传 | 小项目、测试环境 |
| rsync同步 | 增量同步、速度快 | 需要配置 | 频繁更新 |
| 打包上传 | 文件小、传输快 | 需要解压 | 初次部署 |
| SFTP工具 | 可视化操作 | 手动操作 | 不熟悉命令行的用户 |

## 🚀 方式1：使用 SCP 直接上传（推荐）

### 优点
- ✅ 最简单直接
- ✅ 不需要Git
- ✅ 一条命令完成

### 步骤

#### 1. 排除不需要上传的文件

先打包需要上传的文件：

```bash
cd /Users/chenwenying/Desktop/星火工坊-sparkLab/AppStarCardServer_node_test

# 创建临时目录
mkdir -p /tmp/deploy_package

# 复制需要的文件（排除 node_modules、.env 等）
rsync -av \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude 'uploads' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  ./ /tmp/deploy_package/
```

#### 2. 上传到服务器

```bash
# 使用SCP上传整个目录
scp -r /tmp/deploy_package/* root@120.26.179.60:/root/AppStarCardServer/

# 或者使用压缩包方式（推荐，更快）
cd /tmp
tar -czf deploy_package.tar.gz deploy_package
scp deploy_package.tar.gz root@120.26.179.60:/root/

# 在服务器上解压
ssh root@120.26.179.60 "cd /root && tar -xzf deploy_package.tar.gz && mv deploy_package AppStarCardServer"
```

#### 3. SSH连接到服务器进行配置

```bash
ssh root@120.26.179.60
```

#### 4. 在服务器上配置环境

```bash
# 进入项目目录
cd /root/AppStarCardServer

# 安装依赖
npm install --production

# 创建 .env 文件
cat > .env << 'EOF'
# 服务器配置
PORT=3000
NODE_ENV=production

# ECS自建MySQL数据库配置（使用localhost因为在同一服务器）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Star@Card2025!
DB_NAME=starcard_db

# JWT 密钥
JWT_SECRET=starcard_jwt_secret_key_2025_DO_NOT_SHARE

# 微信小程序配置
WECHAT_APPID=wx0da0a295d832ab13
WECHAT_SECRET=f3c6359eda75c63a8d8a44653c2cb4e3
EOF

# 创建uploads目录
mkdir -p uploads

# 安装PM2（进程管理工具）
npm install -g pm2

# 启动服务
pm2 start src/app.js --name "starcard-server"

# 设置开机自启
pm2 startup
pm2 save

# 查看服务状态
pm2 status
pm2 logs starcard-server
```

## 🔄 方式2：使用 rsync 增量同步（推荐用于更新）

### 优点
- ✅ 只传输修改的文件
- ✅ 速度快
- ✅ 适合频繁更新

### 创建同步脚本

在本地项目根目录创建 `deploy.sh`：

```bash
#!/bin/bash

# 本地项目目录
LOCAL_DIR="/Users/chenwenying/Desktop/星火工坊-sparkLab/AppStarCardServer_node_test"
# 服务器信息
SERVER_USER="root"
SERVER_IP="120.26.179.60"
SERVER_DIR="/root/AppStarCardServer"

echo "=========================================="
echo "🚀 开始部署到服务器"
echo "=========================================="
echo ""

# 使用rsync同步代码
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude 'uploads/*' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude '.pm2' \
  "$LOCAL_DIR/" "$SERVER_USER@$SERVER_IP:$SERVER_DIR/"

echo ""
echo "✅ 代码同步完成"
echo ""
echo "=========================================="
echo "🔄 重启服务器上的应用"
echo "=========================================="

# 在服务器上重启应用
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /root/AppStarCardServer
npm install --production
pm2 restart starcard-server
pm2 logs starcard-server --lines 20
ENDSSH

echo ""
echo "✅ 部署完成！"
echo ""
echo "查看日志："
echo "ssh root@120.26.179.60 'pm2 logs starcard-server'"
```

### 使用方法

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

## 📦 方式3：打包上传（适合初次部署）

### 在本地打包

```bash
cd /Users/chenwenying/Desktop/星火工坊-sparkLab

# 打包项目（排除不需要的文件）
tar -czf starcard-server.tar.gz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='uploads' \
  --exclude='*.log' \
  AppStarCardServer_node_test

# 上传到服务器
scp starcard-server.tar.gz root@120.26.179.60:/root/

# 清理本地压缩包
rm starcard-server.tar.gz
```

### 在服务器上解压和配置

```bash
# SSH连接到服务器
ssh root@120.26.179.60

# 解压
cd /root
tar -xzf starcard-server.tar.gz
mv AppStarCardServer_node_test AppStarCardServer
cd AppStarCardServer

# 后续步骤同方式1
```

## 🖥️ 方式4：使用SFTP可视化工具

### 推荐工具

1. **FileZilla**（免费，跨平台）
   - 下载：https://filezilla-project.org/
   
2. **Transmit**（Mac，付费但好用）
   - 下载：https://panic.com/transmit/

3. **WinSCP**（Windows，免费）
   - 下载：https://winscp.net/

### 使用步骤

1. 打开SFTP工具
2. 连接信息：
   - 主机：`120.26.179.60`
   - 端口：`22`
   - 用户名：`root`
   - 密码：你的SSH密码
   
3. 连接后：
   - 左侧：本地项目目录
   - 右侧：服务器目录 `/root/AppStarCardServer`
   
4. 拖拽文件上传（排除 node_modules、.env等）

5. 上传后在服务器终端执行配置命令

## 🔧 服务器端完整配置脚本

保存为 `server_setup.sh`，上传到服务器后执行：

```bash
#!/bin/bash

echo "=========================================="
echo "⚙️  服务器环境配置"
echo "=========================================="

# 1. 安装Node.js（如果还没安装）
if ! command -v node &> /dev/null; then
    echo "📦 安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js版本: $(node -v)"
echo "✅ NPM版本: $(npm -v)"

# 2. 安装PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 3. 进入项目目录
cd /root/AppStarCardServer

# 4. 安装项目依赖
echo "📦 安装项目依赖..."
npm install --production

# 5. 创建.env文件
echo "📝 创建配置文件..."
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Star@Card2025!
DB_NAME=starcard_db
JWT_SECRET=starcard_jwt_secret_key_2025_DO_NOT_SHARE
WECHAT_APPID=wx0da0a295d832ab13
WECHAT_SECRET=f3c6359eda75c63a8d8a44653c2cb4e3
EOF

# 6. 创建必要的目录
mkdir -p uploads
mkdir -p logs

# 7. 导入数据库（如果需要）
if [ -f "init_database.sql" ]; then
    echo "📊 导入数据库..."
    mysql -u root -p'Star@Card2025!' < init_database.sql
fi

# 8. 启动服务
echo "🚀 启动服务..."
pm2 start src/app.js --name starcard-server
pm2 startup
pm2 save

# 9. 显示状态
pm2 status
pm2 logs starcard-server --lines 10

echo ""
echo "=========================================="
echo "✅ 配置完成！"
echo "=========================================="
echo ""
echo "常用命令："
echo "  查看状态：pm2 status"
echo "  查看日志：pm2 logs starcard-server"
echo "  重启服务：pm2 restart starcard-server"
echo "  停止服务：pm2 stop starcard-server"
echo ""
```

使用方法：

```bash
# 在本地上传脚本
scp server_setup.sh root@120.26.179.60:/root/

# SSH到服务器执行
ssh root@120.26.179.60
chmod +x /root/server_setup.sh
/root/server_setup.sh
```

## 📝 快速部署命令（一键部署）

创建一个本地一键部署脚本 `quick_deploy.sh`：

```bash
#!/bin/bash

echo "🚀 一键部署到云服务器"
echo ""

# 配置
SERVER="root@120.26.179.60"
PROJECT_DIR="/Users/chenwenying/Desktop/星火工坊-sparkLab/AppStarCardServer_node_test"
SERVER_DIR="/root/AppStarCardServer"

# 1. 打包代码
echo "📦 1. 打包代码..."
cd "$PROJECT_DIR"
tar -czf /tmp/deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='uploads' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  .

# 2. 上传到服务器
echo "⬆️  2. 上传到服务器..."
scp /tmp/deploy.tar.gz $SERVER:/tmp/

# 3. 在服务器上解压和部署
echo "📂 3. 解压和配置..."
ssh $SERVER << 'ENDSSH'
# 备份旧版本
if [ -d /root/AppStarCardServer ]; then
    mv /root/AppStarCardServer /root/AppStarCardServer.backup.$(date +%Y%m%d_%H%M%S)
fi

# 解压新版本
mkdir -p /root/AppStarCardServer
cd /root/AppStarCardServer
tar -xzf /tmp/deploy.tar.gz

# 安装依赖
npm install --production

# 重启服务（如果已运行）
if pm2 list | grep -q "starcard-server"; then
    pm2 restart starcard-server
else
    pm2 start src/app.js --name starcard-server
    pm2 save
fi

# 显示状态
echo ""
echo "✅ 部署完成！"
pm2 status
pm2 logs starcard-server --lines 10
ENDSSH

# 4. 清理
rm /tmp/deploy.tar.gz

echo ""
echo "🎉 部署成功完成！"
echo ""
echo "访问测试："
echo "curl http://120.26.179.60:3000/api/health"
```

使用：

```bash
chmod +x quick_deploy.sh
./quick_deploy.sh
```

## ⚙️ PM2 常用命令

```bash
# 查看所有应用
pm2 list

# 查看某个应用状态
pm2 show starcard-server

# 查看日志
pm2 logs starcard-server
pm2 logs starcard-server --lines 100

# 重启应用
pm2 restart starcard-server

# 停止应用
pm2 stop starcard-server

# 删除应用
pm2 delete starcard-server

# 监控
pm2 monit

# 清空日志
pm2 flush
```

## 🔒 配置Nginx反向代理（可选）

如果需要使用域名和HTTPS：

```bash
# 安装Nginx
sudo apt install nginx -y

# 配置Nginx
sudo nano /etc/nginx/sites-available/starcard
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/starcard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🎯 部署检查清单

- [ ] 代码已上传到服务器
- [ ] 已安装Node.js和npm
- [ ] 已安装项目依赖（npm install）
- [ ] 已创建.env配置文件
- [ ] 数据库已导入
- [ ] MySQL服务正常运行
- [ ] 已创建uploads目录
- [ ] 已安装并配置PM2
- [ ] 服务已启动（pm2 start）
- [ ] 防火墙已开放3000端口
- [ ] 可以访问API接口

## 🐛 常见问题

### 1. 权限问题

```bash
# 给项目目录权限
sudo chown -R $USER:$USER /root/AppStarCardServer
chmod -R 755 /root/AppStarCardServer
```

### 2. 端口被占用

```bash
# 查看3000端口占用
lsof -i :3000
# 或
netstat -tlnp | grep 3000

# 杀掉进程
kill -9 <PID>
```

### 3. 依赖安装失败

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📞 需要帮助？

如果遇到问题：

1. 查看PM2日志：`pm2 logs starcard-server`
2. 查看Nginx日志：`tail -f /var/log/nginx/error.log`
3. 检查服务器资源：`top` 或 `htop`
4. 测试接口：`curl http://localhost:3000/api/health`

祝部署顺利！🎉

