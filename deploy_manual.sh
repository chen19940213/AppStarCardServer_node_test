#!/bin/bash

# 手动部署脚本（会提示输入密码）
# 每个步骤单独执行，可以交互式输入密码

echo "=========================================="
echo "📦 手动部署流程"
echo "=========================================="
echo ""

# 1. 打包
echo "步骤1：打包代码..."
tar -czf /tmp/starcard-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='uploads/*' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    .

echo "✅ 打包完成：/tmp/starcard-deploy.tar.gz"
echo ""

# 2. 上传
echo "步骤2：上传到服务器（需要输入SSH密码）..."
echo "目标：root@120.26.179.60:/tmp/"
echo ""
scp /tmp/starcard-deploy.tar.gz root@120.26.179.60:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ 上传失败"
    exit 1
fi

echo ""
echo "✅ 上传成功"
echo ""

# 3. 提示手动SSH
echo "=========================================="
echo "步骤3：SSH连接到服务器并部署"
echo "=========================================="
echo ""
echo "请执行以下命令连接到服务器："
echo ""
echo "  ssh root@120.26.179.60"
echo ""
echo "然后在服务器上执行："
echo ""
cat << 'ENDSSH'
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

# 创建.env（如果不存在）
if [ ! -f .env ]; then
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
fi

# 创建目录
mkdir -p uploads logs

# 安装PM2（如果没有）
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 启动或重启
if pm2 list | grep -q "starcard-server"; then
    pm2 restart starcard-server
else
    pm2 start src/app.js --name starcard-server
    pm2 startup
    pm2 save
fi

# 查看状态
pm2 status
pm2 logs starcard-server --lines 10
ENDSSH

echo ""
echo "=========================================="
echo ""
echo "💡 或者，复制上面的命令保存为服务器脚本后执行"

