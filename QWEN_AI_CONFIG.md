# 千问AI配置说明

## 概述

本服务集成了通义千问（Qwen）AI模型，用于对上传的图片进行美观度评估。AI会从构图、色彩、清晰度等多个维度评价图片，并给出评分和评语。

## 环境变量配置

在项目根目录的 `.env` 文件中添加以下配置：

```env
# 千问AI配置
QWEN_API_KEY=your_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

### 获取API Key

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册/登录您的阿里云账号
3. 创建API密钥（API Key）
4. 将API Key复制到 `.env` 文件中的 `QWEN_API_KEY`

### API URL说明

- **默认值**：`https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- 如果使用自定义端点，请在 `.env` 中设置 `QWEN_API_URL`

## 使用方式

### 1. 通过统一路由接口调用

```bash
curl -X POST 'http://localhost:3000/api' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "action": "appraisal.create",
    "card_name": "测试卡片",
    "card_image": "http://example.com/image.jpg"
  }'
```

### 2. 直接调用鉴定接口

```bash
curl -X POST 'http://localhost:3000/api/appraisal/create' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "card_name": "测试卡片",
    "card_image": "http://172.17.179.106:3000/uploads/your_image.png"
  }'
```

## 返回格式

### 成功响应

```json
{
  "code": 0,
  "message": "鉴定成功",
  "data": {
    "id": 1,
    "card_name": "测试卡片",
    "card_image": "http://...",
    "status": "pending",
    "result": "图片质量优秀（评分：85分）- 图片构图优美，色彩搭配和谐...",
    "ai_judgment": {
      "isBeautiful": true,
      "score": 85,
      "comment": "图片构图优美，色彩搭配和谐，清晰度较高，整体视觉效果不错，是一张好看的图片。"
    }
  }
}
```

### AI判断字段说明

- `isBeautiful`: `boolean` - 图片是否好看
- `score`: `number` - 评分（0-100分）
- `comment`: `string` - AI给出的详细评语

## 开发模式

如果未配置 `QWEN_API_KEY` 或处于开发环境（`NODE_ENV=development`），系统会自动使用模拟结果，便于开发测试。

## 支持的图片格式

- 支持的模型：`qwen-vl-plus`, `qwen-vl-max`, `qwen-vl-ocr`
- 支持的图片格式：JPEG, PNG, GIF, WebP
- 图片大小限制：10MB

## 注意事项

1. **API调用费用**：通义千问API可能产生费用，请查看阿里云官方定价
2. **调用频率限制**：注意API的调用频率限制，避免超出配额
3. **网络超时**：API调用超时设置为30秒，如果图片较大或网络较慢，可能需要调整
4. **错误处理**：如果AI服务不可用，系统会返回备用结果，不会影响主流程

## 故障排查

### 问题1：提示"千问AI配置未设置"

**解决方案**：
1. 检查 `.env` 文件中是否已配置 `QWEN_API_KEY`
2. 确保 `.env` 文件在项目根目录
3. 重启服务器使配置生效

### 问题2：AI调用失败

**可能原因**：
- API Key无效或过期
- 网络连接问题
- API配额已用完
- 图片URL无法访问

**解决方案**：
- 开发环境会自动使用模拟结果
- 检查API Key是否正确
- 确认图片URL可公开访问
- 查看服务器日志了解详细错误信息

## 示例代码

### JavaScript (前端)

```javascript
// 上传图片并鉴定
async function uploadAndAppraise(imageBase64) {
  // 1. 先上传图片
  const uploadRes = await fetch('http://localhost:3000/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'upload.image',
      file: imageBase64
    })
  });
  
  const uploadData = await uploadRes.json();
  const imageUrl = uploadData.data.url;
  
  // 2. 调用鉴定接口
  const appraiseRes = await fetch('http://localhost:3000/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'appraisal.create',
      card_name: '我的卡片',
      card_image: imageUrl
    })
  });
  
  const appraiseData = await appraiseRes.json();
  console.log('AI鉴定结果:', appraiseData.data.ai_judgment);
  return appraiseData;
}
```

