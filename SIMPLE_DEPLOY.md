# 简单部署指南（3步完成）

## 📦 第1步：代码已打包（✅ 已完成）

文件位置：`/tmp/starcard-deploy.tar.gz`

## ⬆️ 第2步：上传到服务器

### 方式1：使用命令行上传

```bash
# 打开终端，执行：
sftp root@120.26.179.60

# 输入密码后，在sftp提示符下执行：
put /tmp/starcard-deploy.tar.gz /tmp/
quit
```

### 方式2：使用Mac访达（Finder）

1. 打开"访达"
2. 按 `Command+K` (或菜单：前往 → 连接服务器)
3. 输入：`sftp://root@120.26.179.60`
4. 点击"连接"，输入密码
5. 拖拽 `/tmp/starcard-deploy.tar.gz` 到服务器的 `/tmp` 目录

## 🔧 第3步：在服务器上部署

### 3.1 连接到服务器

```bash
ssh root@120.26.179.60
# 输入密码
```

### 3.2 执行部署命令（复制整段）

连接成功后，复制并执行以下完整脚本：

```bash
#!/bin/bash

echo "=========================================="
echo "🚀 开始部署星火工坊服务"
echo "=========================================="
echo ""

# 1. 备份旧版本
if [ -d /root/AppStarCardServer ]; then
    echo "📦 备份旧版本..."
    mv /root/AppStarCardServer /root/AppStarCardServer.backup.$(date +%Y%m%d_%H%M%S)
fi

# 2. 创建新目录
echo "📁 创建项目目录..."
mkdir -p /root/AppStarCardServer
cd /root/AppStarCardServer

# 3. 解压代码
echo "📂 解压代码..."
tar -xzf /tmp/starcard-deploy.tar.gz

# 4. 安装Node.js（如果没有）
if ! command -v node &> /dev/null; then
    echo "📦 安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js版本: $(node -v)"
echo "✅ NPM版本: $(npm -v)"

# 5. 安装项目依赖
echo "📦 安装项目依赖..."
npm install --production

# 6. 创建.env配置文件
echo "⚙️  创建配置文件..."
cat > .env << 'EOF'
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置（使用localhost）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Star@Card2025!
DB_NAME=starcard_db

# JWT密钥
JWT_SECRET=starcard_jwt_secret_key_2025_DO_NOT_SHARE

# 微信小程序配置
WECHAT_APPID=wx0da0a295d832ab13
WECHAT_SECRET=f3c6359eda75c63a8d8a44653c2cb4e3
EOF

echo "✅ 配置文件已创建"

# 7. 创建必要目录
echo "📁 创建上传目录..."
mkdir -p uploads
mkdir -p logs

# 8. 导入数据库（如果SQL文件存在）
if [ -f "init_database.sql" ]; then
    echo "📊 导入数据库..."
    mysql -u root -p'Star@Card2025!' < init_database.sql 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ 数据库导入成功"
    else
        echo "⚠️  数据库可能已存在或导入失败"
    fi
fi

# 9. 安装PM2（如果没有）
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 10. 启动服务
echo "🚀 启动服务..."
if pm2 list | grep -q "starcard-server"; then
    echo "重启已存在的服务..."
    pm2 restart starcard-server
else
    echo "首次启动服务..."
    pm2 start src/app.js --name starcard-server
    pm2 startup
    pm2 save
fi

# 11. 显示状态
echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "服务状态："
pm2 status

echo ""
echo "最近日志："
pm2 logs starcard-server --lines 15 --nostream

echo ""
echo "=========================================="
echo "🎉 部署成功！"
echo "=========================================="
echo ""
echo "服务地址："
echo "  http://120.26.179.60:3000"
echo ""
echo "测试命令："
echo "  curl http://localhost:3000/api/health"
echo ""
echo "常用命令："
echo "  查看日志：pm2 logs starcard-server"
echo "  重启服务：pm2 restart starcard-server"
echo "  停止服务：pm2 stop starcard-server"
echo "  查看状态：pm2 status"
echo ""
```

## ✅ 验证部署

### 在服务器上测试

```bash
# 测试健康检查接口
curl http://localhost:3000/api/health

# 查看服务日志
pm2 logs starcard-server
```

### 在本地测试

```bash
# 测试API
curl http://120.26.179.60:3000/api/health
```

## 📋 后续更新

下次更新代码时，只需要：

```bash
# 1. 本地打包
cd /Users/chenwenying/Desktop/星火工坊-sparkLab/AppStarCardServer_node_test
tar -czf /tmp/starcard-update.tar.gz \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='uploads' \
    --exclude='*.log' \
    .

# 2. 上传（使用sftp）
sftp root@120.26.179.60
put /tmp/starcard-update.tar.gz /tmp/
quit

# 3. 在服务器上更新
ssh root@120.26.179.60
cd /root/AppStarCardServer
tar -xzf /tmp/starcard-update.tar.gz
npm install --production
pm2 restart starcard-server
pm2 logs starcard-server --lines 20
```

## 🔧 常用PM2命令

```bash
# 查看所有服务
pm2 list

# 查看详细信息
pm2 show starcard-server

# 查看实时日志
pm2 logs starcard-server

# 查看最后N行日志
pm2 logs starcard-server --lines 50

# 重启服务
pm2 restart starcard-server

# 停止服务
pm2 stop starcard-server

# 删除服务
pm2 delete starcard-server

# 清空日志
pm2 flush

# 监控面板
pm2 monit
```

## 🆘 遇到问题？

### 端口被占用

```bash
# 查看3000端口
lsof -i :3000
# 或
netstat -tlnp | grep 3000

# 杀掉进程
kill -9 <PID>
```

### 数据库连接失败

```bash
# 检查MySQL状态
systemctl status mysql

# 重启MySQL
systemctl restart mysql

# 测试连接
mysql -u root -p'Star@Card2025!' -e "SHOW DATABASES;"
```

### 查看详细错误日志

```bash
# PM2日志
pm2 logs starcard-server --err

# 或查看文件日志
tail -f /root/.pm2/logs/starcard-server-error.log
tail -f /root/.pm2/logs/starcard-server-out.log
```

## 🎯 总结

三步完成部署：
1. ✅ 打包（已完成）：`/tmp/starcard-deploy.tar.gz`
2. ⬆️ 上传：使用 `sftp` 或访达
3. 🚀 部署：SSH到服务器，复制执行上面的脚本

祝部署顺利！🎉

