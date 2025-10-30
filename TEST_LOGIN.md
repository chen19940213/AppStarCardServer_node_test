# 微信小程序登录测试指南

## ✅ 配置验证通过

你的服务器配置是正确的：
- AppID: `wx0da0a295d832ab13` ✅
- AppSecret: 已配置且有效 ✅

## 🧪 测试步骤

### 方法1：使用微信开发者工具（推荐）

#### 第1步：创建测试页面

在小程序项目中创建测试页面 `pages/test/test.wxml`：

```xml
<!-- pages/test/test.wxml -->
<view class="container">
  <button bindtap="testLogin">测试登录</button>
  <view class="result">{{result}}</view>
</view>
```

#### 第2步：编写测试逻辑

`pages/test/test.js`：

```javascript
Page({
  data: {
    result: '点击按钮测试登录'
  },

  testLogin() {
    this.setData({ result: '正在获取code...' });
    
    // 1. 调用微信登录获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          const code = res.code;
          console.log('获取到code:', code);
          
          this.setData({ result: `获取code成功: ${code}\n正在登录...` });
          
          // 2. 发送code到后端
          wx.request({
            url: 'http://localhost:3000/api/user/login',  // 👈 本地测试
            // url: 'https://your-domain.com/api/user/login',  // 👈 生产环境
            method: 'POST',
            data: {
              code: code,
              userInfo: {
                nickname: '测试用户',
                avatar: 'https://example.com/avatar.jpg'
              }
            },
            success: (response) => {
              console.log('登录响应:', response.data);
              
              if (response.data.code === 0) {
                // 登录成功
                const { token, userInfo } = response.data.data;
                
                // 保存token
                wx.setStorageSync('token', token);
                wx.setStorageSync('userInfo', userInfo);
                
                this.setData({ 
                  result: `登录成功！\n用户ID: ${userInfo.id}\n昵称: ${userInfo.nickname}` 
                });
                
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
              } else {
                // 登录失败
                this.setData({ 
                  result: `登录失败: ${response.data.message}` 
                });
              }
            },
            fail: (error) => {
              console.error('请求失败:', error);
              this.setData({ 
                result: `请求失败: ${error.errMsg}` 
              });
            }
          });
        } else {
          this.setData({ result: '获取code失败' });
        }
      },
      fail: (error) => {
        console.error('wx.login失败:', error);
        this.setData({ result: `wx.login失败: ${error.errMsg}` });
      }
    });
  }
});
```

#### 第3步：配置开发者工具

1. 打开微信开发者工具
2. 打开你的小程序项目（AppID: `wx0da0a295d832ab13`）
3. 点击右上角"详情" → "本地设置"
4. 勾选 ✅ "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
5. 这样可以访问 `http://localhost:3000`

#### 第4步：运行测试

1. 在开发者工具中打开测试页面
2. 点击"测试登录"按钮
3. 查看控制台输出和页面显示结果

### 方法2：使用 curl 测试（需要真实code）

如果你已经在开发者工具中获取到了 code，可以用 curl 测试：

```bash
# 替换为你从小程序获取的真实code
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "从微信开发者工具获取的真实code",
    "userInfo": {
      "nickname": "测试用户",
      "avatar": "https://example.com/avatar.jpg"
    }
  }'
```

## 📱 完整的小程序登录流程

### app.js 中实现自动登录

```javascript
// app.js
App({
  onLaunch() {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      this.login();
    }
  },

  login() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到后端
          wx.request({
            url: 'https://your-domain.com/api/user/login',
            method: 'POST',
            data: {
              code: res.code,
              userInfo: {
                nickname: wx.getStorageSync('userInfo')?.nickName || '新用户',
                avatar: wx.getStorageSync('userInfo')?.avatarUrl || ''
              }
            },
            success: (response) => {
              if (response.data.code === 0) {
                const { token, userInfo } = response.data.data;
                wx.setStorageSync('token', token);
                wx.setStorageSync('userInfo', userInfo);
                console.log('自动登录成功');
              }
            }
          });
        }
      }
    });
  },

  globalData: {
    userInfo: null
  }
});
```

### 在页面中使用 token

```javascript
// 需要认证的接口请求
wx.request({
  url: 'https://your-domain.com/api/user/info',
  method: 'GET',
  header: {
    'Authorization': `Bearer ${wx.getStorageSync('token')}`
  },
  success: (res) => {
    console.log('用户信息:', res.data);
  }
});
```

## 🔒 生产环境配置

### 1. 配置服务器域名白名单

在微信公众平台：
1. 登录 https://mp.weixin.qq.com
2. 开发 → 开发管理 → 开发设置 → 服务器域名
3. 添加你的服务器域名（必须是 HTTPS）：
   ```
   request合法域名：https://your-domain.com
   ```

### 2. 部署到生产服务器

确保你的服务器：
- ✅ 使用 HTTPS
- ✅ 有合法的SSL证书
- ✅ 端口开放（通常443）
- ✅ 域名已备案（中国大陆）

### 3. 修改小程序代码中的 URL

```javascript
// 开发环境
const API_BASE_URL = 'http://localhost:3000';

// 生产环境
const API_BASE_URL = 'https://your-domain.com';

// 自动判断
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com' 
  : 'http://localhost:3000';
```

## ⚠️ 常见问题

### 1. "request:fail url not in domain list"

**原因**：服务器域名未配置或未在白名单中

**解决**：
- 开发环境：在开发者工具中勾选"不校验合法域名"
- 生产环境：在微信公众平台添加域名白名单

### 2. "code已被使用"

**原因**：同一个 code 只能使用一次

**解决**：重新调用 `wx.login()` 获取新的 code

### 3. "code无效"

**原因**：code 超过5分钟失效

**解决**：获取code后立即发送到后端

### 4. 无法连接到服务器

**原因**：网络问题或服务器未启动

**解决**：
- 检查服务器是否运行：`curl http://localhost:3000/api/health`
- 检查防火墙设置
- 确保手机和电脑在同一网络（使用IP地址）

## ✅ 测试检查清单

- [ ] 微信开发者工具已打开正确的小程序（AppID: wx0da0a295d832ab13）
- [ ] 已创建测试页面和测试代码
- [ ] 已勾选"不校验合法域名"
- [ ] 后端服务正在运行（http://localhost:3000）
- [ ] 点击测试按钮，查看控制台输出
- [ ] 登录成功后，token 已保存到本地存储

## 📞 获取帮助

如果仍有问题：
1. 查看微信开发者工具的控制台（Console）
2. 查看服务器日志：`tail -f /tmp/node_server.log`
3. 确认数据库连接正常

祝测试顺利！🎉

