#!/bin/bash

# 快速部署脚本 - 不使用Git
# 使用方法: ./deploy.sh

# ========================================
# 配置区域
# ========================================
SERVER_USER="root"
SERVER_IP="120.26.179.60"
SERVER_DIR="/root/AppStarCardServer"
LOCAL_PROJECT_DIR=$(pwd)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# 函数定义
# ========================================

print_header() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}$1${NC}"
    echo "=========================================="
    echo ""
}

print_info() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# ========================================
# 主流程
# ========================================

print_header "🚀 开始部署到云服务器"

# 1. 检查本地环境
print_info "检查本地环境..."
if [ ! -f "package.json" ]; then
    print_error "错误：未找到package.json，请在项目根目录执行此脚本"
    exit 1
fi

# 2. 打包代码
print_header "📦 打包项目代码"
print_info "排除 node_modules, .env, .git 等文件..."

cd "$LOCAL_PROJECT_DIR"
tar -czf /tmp/starcard-deploy-$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='uploads/*' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='.pm2' \
    .

PACKAGE_FILE=$(ls -t /tmp/starcard-deploy-*.tar.gz | head -1)
PACKAGE_SIZE=$(du -h "$PACKAGE_FILE" | cut -f1)

print_info "打包完成：$PACKAGE_FILE ($PACKAGE_SIZE)"

# 3. 上传到服务器
print_header "⬆️  上传到服务器"
print_info "目标服务器：$SERVER_USER@$SERVER_IP"

scp "$PACKAGE_FILE" "$SERVER_USER@$SERVER_IP:/tmp/deploy.tar.gz"

if [ $? -eq 0 ]; then
    print_info "上传成功"
else
    print_error "上传失败"
    exit 1
fi

# 4. 在服务器上部署
print_header "🔧 在服务器上部署"

ssh "$SERVER_USER@$SERVER_IP" bash << 'ENDSSH'

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}✓${NC} 连接到服务器成功"

# 4.1 备份旧版本
if [ -d /root/AppStarCardServer ]; then
    BACKUP_DIR="/root/AppStarCardServer.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓${NC} 备份旧版本到: $BACKUP_DIR"
    mv /root/AppStarCardServer "$BACKUP_DIR"
fi

# 4.2 解压新版本
echo -e "${GREEN}✓${NC} 解压代码..."
mkdir -p /root/AppStarCardServer
cd /root/AppStarCardServer
tar -xzf /tmp/deploy.tar.gz

# 4.3 安装依赖
echo -e "${GREEN}✓${NC} 安装依赖..."
npm install --production --silent

# 4.4 检查.env文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠${NC} 未找到.env文件，创建默认配置..."
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
    echo -e "${YELLOW}⚠${NC} 请检查并修改.env文件中的配置"
fi

# 4.5 创建必要目录
mkdir -p uploads
mkdir -p logs

# 4.6 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓${NC} 安装PM2..."
    npm install -g pm2
fi

# 4.7 启动或重启服务
echo -e "${GREEN}✓${NC} 启动服务..."
if pm2 list | grep -q "starcard-server"; then
    echo "重启已存在的服务..."
    pm2 restart starcard-server
else
    echo "首次启动服务..."
    pm2 start src/app.js --name starcard-server
    pm2 startup
    pm2 save
fi

# 4.8 显示状态
echo ""
echo "=========================================="
echo "服务状态："
echo "=========================================="
pm2 status

echo ""
echo "=========================================="
echo "最近日志："
echo "=========================================="
pm2 logs starcard-server --lines 15 --nostream

ENDSSH

# 5. 清理本地临时文件
print_header "🧹 清理临时文件"
rm -f "$PACKAGE_FILE"
print_info "清理完成"

# 6. 完成
print_header "✅ 部署完成！"
echo ""
echo "服务器信息："
echo "  地址：http://$SERVER_IP:3000"
echo "  测试：curl http://$SERVER_IP:3000/api/health"
echo ""
echo "常用命令："
echo "  查看日志：ssh $SERVER_USER@$SERVER_IP 'pm2 logs starcard-server'"
echo "  重启服务：ssh $SERVER_USER@$SERVER_IP 'pm2 restart starcard-server'"
echo "  查看状态：ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
echo ""
echo "SSH连接："
echo "  ssh $SERVER_USER@$SERVER_IP"
echo ""

# 7. 测试接口
print_header "🧪 测试接口连通性"
sleep 2
echo "测试健康检查接口..."
curl -s "http://$SERVER_IP:3000/api/health" | python3 -m json.tool 2>/dev/null || echo "接口暂时无法访问，请稍后再试"

echo ""
print_info "部署流程全部完成！🎉"
echo ""

