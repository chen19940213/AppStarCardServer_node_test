# 统一路由 API 使用文档

## 概述

统一路由入口允许通过固定的 URL `/api/router` 来访问所有接口，实际的路由路径放在请求体的 `path` 字段中。

## 接口地址

**POST** `/api/router`

## 请求格式

```json
{
  "path": "路由路径",
  "data": {
    // 请求数据
  },
  "params": {
    // URL 参数（用于需要 id 等参数的接口）
    "id": "123",
    "query": {
      // query 参数
      "page": 1,
      "pageSize": 10
    }
  }
}
```

## 认证

需要认证的接口，请在请求头中添加：

```
Authorization: Bearer <token>
```

## 可用路由列表

### 用户相关

#### 1. 用户登录
```json
{
  "path": "user/login",
  "data": {
    "code": "微信登录code",
    "userInfo": {
      "nickname": "用户名",
      "avatar": "头像URL"
    }
  }
}
```

**示例：**
```bash
curl -X POST http://localhost:3000/api/router \
  -H "Content-Type: application/json" \
  -d '{
    "path": "user/login",
    "data": {
      "code": "test_code_123",
      "userInfo": {
        "nickname": "测试用户",
        "avatar": "https://example.com/avatar.jpg"
      }
    }
  }'
```

#### 2. 获取用户信息（需认证）
```json
{
  "path": "user/info"
}
```

**示例：**
```bash
curl -X POST http://localhost:3000/api/router \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "path": "user/info"
  }'
```

#### 3. 更新用户信息（需认证）
```json
{
  "path": "user/update",
  "data": {
    "nickname": "新昵称",
    "mobile": "13800138000"
  }
}
```

### 鉴定相关

#### 1. 创建鉴定记录（需认证）
```json
{
  "path": "appraisal/create",
  "data": {
    "card_name": "卡片名称",
    "card_image": "图片URL",
    "status": "pending"
  }
}
```

#### 2. 获取鉴定列表（需认证）
```json
{
  "path": "appraisal/list",
  "params": {
    "query": {
      "page": 1,
      "pageSize": 10
    }
  }
}
```

#### 3. 获取鉴定详情（需认证）
```json
{
  "path": "appraisal/detail",
  "params": {
    "id": "123"
  }
}
```
或
```json
{
  "path": "appraisal/detail",
  "data": {
    "id": "123"
  }
}
```

#### 4. 删除鉴定记录（需认证）
```json
{
  "path": "appraisal/delete",
  "params": {
    "id": "123"
  }
}
```

### 上传相关

#### 上传图片（需认证）
**注意：** 文件上传需要使用 `multipart/form-data` 格式，文件字段名为 `file`，同时需要传递 JSON 数据。

由于 Express 的限制，文件上传可能需要在原始接口 `/api/upload/image` 进行，或需要特殊处理。

## 响应格式

### 成功响应
```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    // 返回数据
  }
}
```

### 错误响应
```json
{
  "code": -1,
  "message": "错误信息"
}
```

## 错误码

- `400`: 请求参数错误
- `401`: 未提供认证令牌
- `403`: 令牌无效或已过期
- `404`: 路由不存在
- `500`: 服务器内部错误

## 完整示例

### JavaScript (Fetch API)
```javascript
// 用户登录
async function login(code, userInfo) {
  const response = await fetch('http://localhost:3000/api/router', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: 'user/login',
      data: {
        code: code,
        userInfo: userInfo
      }
    })
  });
  return await response.json();
}

// 获取用户信息（需要 token）
async function getUserInfo(token) {
  const response = await fetch('http://localhost:3000/api/router', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      path: 'user/info'
    })
  });
  return await response.json();
}
```

### Python (requests)
```python
import requests

# 用户登录
def login(code, user_info):
    url = 'http://localhost:3000/api/router'
    data = {
        'path': 'user/login',
        'data': {
            'code': code,
            'userInfo': user_info
        }
    }
    response = requests.post(url, json=data)
    return response.json()

# 获取用户信息
def get_user_info(token):
    url = 'http://localhost:3000/api/router'
    headers = {
        'Authorization': f'Bearer {token}'
    }
    data = {
        'path': 'user/info'
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

