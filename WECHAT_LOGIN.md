# 微信小程序登录配置指南

## 📱 功能说明

本系统已集成微信小程序登录功能，支持开发模式和生产模式。

## 🔧 配置步骤

### 1. 获取微信小程序配置

登录[微信公众平台](https://mp.weixin.qq.com/)，进入你的小程序：

1. **开发** → **开发管理** → **开发设置**
2. 找到以下信息：
   - **AppID（小程序ID）**：`wx1234567890abcdef`
   - **AppSecret（小程序密钥）**：点击"生成"或"重置"获取

⚠️ **注意**：AppSecret 非常重要，请妥善保管，不要泄露或提交到代码仓库！

### 2. 配置环境变量

编辑项目根目录的 `.env` 文件，添加微信配置：

```env
# 微信小程序配置
WECHAT_APPID=wx1234567890abcdef        # 👈 替换为你的AppID
WECHAT_SECRET=abcdef1234567890abcdef   # 👈 替换为你的AppSecret
```

### 3. 重启服务

```bash
npm start
```

## 🎯 使用方式

### 小程序端代码

```javascript
// pages/login/login.js

// 1. 调用微信登录获取code
wx.login({
  success: async (res) => {
    if (res.code) {
      // 2. 获取用户信息
      const userInfo = await getUserProfile(); // 或从其他方式获取
      
      // 3. 发送code和用户信息到后端
      wx.request({
        url: 'http://your-server.com/api/user/login',
        method: 'POST',
        data: {
          code: res.code,
          userInfo: {
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl
          }
        },
        success: (response) => {
          if (response.data.code === 0) {
            // 4. 保存token
            const { token, userInfo } = response.data.data;
            wx.setStorageSync('token', token);
            wx.setStorageSync('userInfo', userInfo);
            
            console.log('登录成功！', userInfo);
            // 跳转到首页
            wx.switchTab({ url: '/pages/index/index' });
          } else {
            wx.showToast({
              title: response.data.message,
              icon: 'none'
            });
          }
        }
      });
    }
  }
});

// 获取用户信息
function getUserProfile() {
  return new Promise((resolve) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => resolve(res.userInfo),
      fail: () => resolve({ nickName: '新用户', avatarUrl: '' })
    });
  });
}
```

### 后续请求携带Token

```javascript
// 在其他需要认证的接口请求中
wx.request({
  url: 'http://your-server.com/api/user/info',
  method: 'GET',
  header: {
    'Authorization': `Bearer ${wx.getStorageSync('token')}`
  },
  success: (res) => {
    console.log('用户信息：', res.data);
  }
});
```

## 🧪 测试模式

### 开发环境测试

在开发环境中，如果 `code` 以 `test_` 开头，系统会使用模拟数据，不会调用真实微信接口：

```bash
# 使用curl测试
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_dev_001",
    "userInfo": {
      "nickname": "测试用户",
      "avatar": "https://example.com/avatar.jpg"
    }
  }'
```

**返回示例**：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "nickname": "测试用户",
      "avatar": "https://example.com/avatar.jpg",
      "mobile": null
    }
  }
}
```

### 生产环境

使用真实的微信 code，系统会调用微信 `code2Session` 接口获取真实的 openid。

## ⚙️ 微信服务API

### 1. code2Session - 登录凭证校验

```javascript
const WechatService = require('./services/wechatService');

// 获取openid和session_key
const result = await WechatService.code2Session(code);
// 返回: { openid, session_key, unionid? }
```

### 2. getAccessToken - 获取access_token

```javascript
// 用于调用其他微信接口
const accessToken = await WechatService.getAccessToken();
```

### 3. checkContent - 内容安全检测

```javascript
// 检查用户提交的文本内容是否合规
const isSafe = await WechatService.checkContent(content, accessToken);
```

## 🔒 安全建议

1. ✅ **不要将 `.env` 文件提交到代码仓库**
   - 已在 `.gitignore` 中排除

2. ✅ **定期更换 AppSecret**
   - 建议每3-6个月更换一次

3. ✅ **服务器端验证**
   - 永远不要在小程序端存储或使用 AppSecret
   - 所有敏感操作都在服务器端完成

4. ✅ **Token安全**
   - JWT token 有效期为7天
   - 过期后需要重新登录

5. ✅ **HTTPS部署**
   - 生产环境必须使用HTTPS
   - 微信小程序要求后端接口必须是HTTPS

## 🐛 常见问题

### 1. 提示"微信配置未设置"

**原因**：`.env` 文件中没有配置 `WECHAT_APPID` 和 `WECHAT_SECRET`

**解决**：
```bash
# 编辑 .env 文件
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret

# 重启服务
npm start
```

### 2. 提示"code无效"或"code已被使用"

**原因**：
- 微信的 code 只能使用一次，5分钟内有效
- code 可能已过期或被使用

**解决**：
- 重新调用 `wx.login()` 获取新的 code

### 3. 提示"invalid appid"

**原因**：AppID 配置错误

**解决**：
- 检查 `.env` 中的 `WECHAT_APPID` 是否正确
- 确认AppID是否与小程序匹配

### 4. 测试环境无法调用微信接口

**解决**：使用 `test_` 开头的 code 进行测试：
```javascript
// 小程序端测试代码
const testCode = 'test_' + Date.now();
```

## 📚 相关文档

- [微信小程序登录文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)
- [code2Session接口文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)
- [内容安全检测文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html)

## 🎯 登录流程图

```
小程序端                                    后端服务器                    微信服务器
   |                                            |                              |
   |  1. wx.login()                             |                              |
   |----------------------------------------->  |                              |
   |  返回 code                                 |                              |
   |<-----------------------------------------  |                              |
   |                                            |                              |
   |  2. 发送 code + userInfo                   |                              |
   |==========================================> |                              |
   |                                            |                              |
   |                                            |  3. code2Session(code)       |
   |                                            |============================> |
   |                                            |                              |
   |                                            |  返回 openid + session_key   |
   |                                            |<============================ |
   |                                            |                              |
   |                                            |  4. 查询/创建用户             |
   |                                            |  5. 生成JWT token             |
   |                                            |                              |
   |  6. 返回 token + userInfo                  |                              |
   |<========================================== |                              |
   |                                            |                              |
   |  7. 保存token，后续请求携带token            |                              |
   |                                            |                              |
```

## ✅ 配置检查清单

- [ ] 已在微信公众平台获取 AppID 和 AppSecret
- [ ] 已在 `.env` 文件中配置 `WECHAT_APPID` 和 `WECHAT_SECRET`
- [ ] 已安装 axios 依赖（`npm install axios`）
- [ ] 已重启服务器
- [ ] 已测试开发模式（test_开头的code）
- [ ] 已在小程序端实现登录流程
- [ ] 已配置服务器域名白名单（小程序后台 → 开发 → 开发设置 → 服务器域名）

## 🚀 下一步

配置完成后，你可以：

1. 在小程序端实现完整的登录流程
2. 使用返回的 token 访问需要认证的接口
3. 实现用户个人中心、订单系统等功能
4. 部署到生产环境，使用HTTPS

祝开发顺利！🎉

