const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const Response = require('../utils/response');
const WechatService = require('../services/wechatService');

class UserController {
  // 用户登录
  static async login(req, res) {
    try {
      const { code, userInfo } = req.body;
      console.log('🔧 用户登录请求:', req.body);
      if (!code) {
        return Response.error(res, '缺少code参数', -1, 400);
      }

      // 调用微信接口获取 openid
      let openid;
      let sessionKey;
      
      try {
        // 如果是开发测试环境且code以'test_'开头，使用模拟数据
        if (process.env.NODE_ENV === 'development' && code.startsWith('test_')) {
          console.log('🔧 开发模式：使用模拟openid');
          openid = 'mock_openid_' + code;
          sessionKey = 'mock_session_key';
        } else {
          // 生产环境：调用真实微信接口
          console.log('📱 调用微信登录接口...');
          const wechatData = await WechatService.code2Session(code);
          openid = wechatData.openid;
          sessionKey = wechatData.session_key;
          console.log('✅ 微信登录成功，openid:', openid);
        }
      } catch (wechatError) {
        console.error('微信登录失败:', wechatError.message);
        return Response.error(res, `微信登录失败: ${wechatError.message}`, -1, 400);
      }

      // 查询或创建用户
      let [users] = await pool.query(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      let user;
      if (users.length === 0) {
        // 创建新用户
        console.log('📝 创建新用户:', openid);
        const [result] = await pool.query(
          'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
          [openid, userInfo?.nickname || '新用户', userInfo?.avatar || '']
        );
        
        user = {
          id: result.insertId,
          openid,
          nickname: userInfo?.nickname || '新用户',
          avatar: userInfo?.avatar || '',
          mobile: null
        };
      } else {
        user = users[0];
        console.log('✅ 用户已存在，ID:', user.id);
        
        // 更新用户信息（如果提供了新信息）
        if (userInfo && (userInfo.nickname || userInfo.avatar)) {
          const updates = [];
          const values = [];
          
          if (userInfo.nickname) {
            updates.push('nickname = ?');
            values.push(userInfo.nickname);
          }
          if (userInfo.avatar) {
            updates.push('avatar = ?');
            values.push(userInfo.avatar);
          }
          
          if (updates.length > 0) {
            values.push(user.id);
            await pool.query(
              `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
              values
            );
            user.nickname = userInfo.nickname || user.nickname;
            user.avatar = userInfo.avatar || user.avatar;
            console.log('📝 更新用户信息');
          }
        }
      }

      // 生成 JWT token
      const token = jwt.sign(
        { userId: user.id, openid: user.openid },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return Response.success(res, {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          mobile: user.mobile
        }
      }, '登录成功');
    } catch (error) {
      console.error('登录失败:', error);
      console.error(1111111);

      return Response.error(res, '登录失败: ' + error.message);
    }
  }

  // 获取用户信息
  static async getUserInfo(req, res) {
    try {
      const [users] = await pool.query(
        'SELECT id, openid, nickname, avatar, mobile, created_at FROM users WHERE id = ?',
        [req.user.userId]
      );

      if (users.length === 0) {
        return Response.error(res, '用户不存在', -1, 404);
      }

      return Response.success(res, users[0]);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return Response.error(res, '获取用户信息失败');
    }
  }

  // 更新用户信息
  static async updateUserInfo(req, res) {
    try {
      const { nickname, mobile } = req.body;
      const updates = [];
      const values = [];

      if (nickname) {
        updates.push('nickname = ?');
        values.push(nickname);
      }
      if (mobile) {
        updates.push('mobile = ?');
        values.push(mobile);
      }

      if (updates.length === 0) {
        return Response.error(res, '没有要更新的字段', -1, 400);
      }

      values.push(req.user.userId);

      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return Response.success(res, null, '更新成功');
    } catch (error) {
      console.error('更新用户信息失败:', error);
      return Response.error(res, '更新失败');
    }
  }
}

module.exports = UserController;

