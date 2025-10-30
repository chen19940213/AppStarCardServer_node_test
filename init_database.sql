-- ====================================
-- 星火工坊 Star Card 数据库初始化脚本
-- ====================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS starcard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE starcard_db;

-- ====================================
-- 用户表
-- ====================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信OpenID',
  nickname VARCHAR(100) DEFAULT '新用户' COMMENT '用户昵称',
  avatar VARCHAR(255) DEFAULT '' COMMENT '用户头像',
  mobile VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_openid (openid),
  INDEX idx_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ====================================
-- 鉴定记录表
-- ====================================
CREATE TABLE IF NOT EXISTS appraisals (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '鉴定记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  card_name VARCHAR(200) DEFAULT NULL COMMENT '卡片名称',
  card_image VARCHAR(255) DEFAULT NULL COMMENT '卡片图片',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态：pending-待处理, processing-处理中, completed-已完成',
  result TEXT DEFAULT NULL COMMENT '鉴定结果',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鉴定记录表';

-- ====================================
-- 插入测试数据（可选）
-- ====================================
-- INSERT INTO users (openid, nickname, avatar) VALUES 
-- ('test_openid_001', '测试用户1', 'https://example.com/avatar1.jpg'),
-- ('test_openid_002', '测试用户2', 'https://example.com/avatar2.jpg');

-- 显示创建的表
SHOW TABLES;

-- 显示表结构
DESCRIBE users;
DESCRIBE appraisals;

SELECT '数据库初始化完成！' AS message;

