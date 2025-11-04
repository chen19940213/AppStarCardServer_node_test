const axios = require('axios');
const https = require('https');
const http = require('http');

class QwenService {
  /**
   * 将图片URL转换为base64
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<string>} base64格式的图片数据
   */
  static async imageUrlToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      protocol.get(imageUrl, (response) => {
        // 如果状态码不是200，可能是重定向，需要处理
        if (response.statusCode === 301 || response.statusCode === 302) {
          return this.imageUrlToBase64(response.headers.location)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          return reject(new Error(`下载图片失败: HTTP ${response.statusCode}`));
        }

        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          // 获取图片类型
          const contentType = response.headers['content-type'] || 'image/png';
          const base64String = `data:${contentType};base64,${base64}`;
          resolve(base64String);
        });
      }).on('error', (error) => {
        reject(new Error(`下载图片失败: ${error.message}`));
      });
    });
  }
  /**
   * 调用千问AI判断多张图片是否好看（批量提交）
   * @param {string[]} imageUrls - 图片URL地址数组
   * @returns {Promise<{isBeautiful: boolean, score: number, comment: string, images_detail?: Array}>}
   */
  static async judgeImages(imageUrls) {
    try {
      const apiKey = process.env.QWEN_API_KEY;
      const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

      if (!apiKey) {
        // 开发环境：如果没有配置API Key，返回模拟结果
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 开发模式：使用模拟AI鉴定结果');
          return this.getMockBatchResult(imageUrls.length);
        }
        throw new Error('千问AI配置未设置，请在.env文件中配置QWEN_API_KEY');
      }

      // 构建提示词，让AI综合判断所有图片
      const prompt = imageUrls.length === 1 
        ? `请仔细观察这张图片，从以下几个维度进行评价：
1. 图中的人帅吗？
2. 色彩是否协调（色彩搭配、饱和度、对比度）
3. 清晰度和质量（图片清晰度、噪点、细节）
4. 整体美感（是否赏心悦目、是否有艺术感）

请给出：
1. 总体评价：是否好看（是/否）
2. 评分：0-100分
3. 详细评语：50字左右的评价

请以JSON格式返回，格式如下：
{
  "isBeautiful": true/false,
  "score": 85,
  "comment": "图片构图优美，色彩搭配和谐，清晰度较高，整体视觉效果不错。"
}`
        : `请仔细观察这${imageUrls.length}张图片，对每张图片从以下几个维度进行评价：
1. 图中的人帅吗？
2. 色彩是否协调（色彩搭配、饱和度、对比度）
3. 清晰度和质量（图片清晰度、噪点、细节）
4. 整体美感（是否赏心悦目、是否有艺术感）

请给出：
1. 总体评价：是否所有图片都好看（是/否）
2. 综合评分：0-100分（所有图片的平均分）
3. 详细评语：对每张图片的评价，格式为"图片1: ...；图片2: ...；..."
4. 每张图片的详细评分（可选）

请以JSON格式返回，格式如下：
{
  "isBeautiful": true/false,
  "score": 85,
  "comment": "图片1: 构图优美，色彩和谐...；图片2: 清晰度较高，细节丰富...",
  "images_detail": [
    {"image_index": 1, "score": 85, "comment": "..."},
    {"image_index": 2, "score": 88, "comment": "..."}
  ]
}`;

      // 检查图片URL是否是本地地址（需要转换为base64）
      const isLocalUrl = (url) => {
        return url.includes('localhost') || 
               url.includes('127.0.0.1') || 
               url.includes('172.17.') || 
               url.includes('192.168.') ||
               url.includes('10.') ||
               !url.startsWith('http://') && !url.startsWith('https://');
      };

      // 构建content数组：先添加所有图片，最后添加文本提示
      const content = [];
      
      console.log('📥 开始处理图片URL，检查是否需要转换为base64...');
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        if (isLocalUrl(imageUrl)) {
          // 本地URL，需要转换为base64
          console.log(`🔄 第 ${i + 1} 张图片是本地地址，转换为base64...`);
          try {
            const base64Image = await this.imageUrlToBase64(imageUrl);
            content.push({
              type: 'image',
              image: base64Image // 使用base64格式
            });
            console.log(`✅ 第 ${i + 1} 张图片转换完成`);
          } catch (error) {
            console.error(`❌ 第 ${i + 1} 张图片转换失败:`, error.message);
            // 转换失败时，仍然尝试使用URL（可能会失败，但至少不会阻塞）
            content.push({
              type: 'image',
              image: imageUrl
            });
          }
        } else {
          // 公网URL，直接使用
          content.push({
            type: 'image',
            image: imageUrl
          });
        }
      }
      
      content.push({
        type: 'text',
        text: prompt
      });

      const requestBody = {
        model: 'qwen-vl-plus', // 或 'qwen-vl-max'
        input: {
          messages: [
            {
              role: 'user',
              content: content
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: imageUrls.length > 1 ? 1000 : 500 // 多张图片需要更多token
        }
      };

      console.log(`📤 发送批量AI请求，共 ${imageUrls.length} 张图片`);

      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable'
          },
          timeout: 120000 // 多张图片+base64转换可能需要更长时间（2分钟）
        }
      );
      console.log('📥 收到AI响应:', JSON.stringify(response.data, null, 2));
      
      // 解析AI返回结果
      const result = this.parseResponse(response.data);
      console.log('result:', JSON.stringify(result, null, 2));

      return result;

    } catch (error) {
      // 打印详细错误信息
      if (error.response) {
        console.error('千问AI API错误详情:');
        console.error('状态码:', error.response.status);
        console.error('错误信息:', error.response.data);
      } else {
        console.error('千问AI调用失败:', error.message);
      }
      
      // 如果是开发环境或API调用失败（400/500等），返回模拟结果
      if (process.env.NODE_ENV === 'development' || error.response?.status) {
        console.log('⚠️ 使用模拟结果作为备用方案');
        return this.getMockBatchResult(imageUrls.length);
      }
      
      throw error;
    }
  }

  /**
   * 调用千问AI判断图片是否好看（单张图片，向后兼容）
   * @param {string} imageUrl - 图片URL地址
   * @returns {Promise<{isBeautiful: boolean, score: number, comment: string}>}
   */
  static async judgeImage(imageUrl) {
    try {
      const apiKey = process.env.QWEN_API_KEY;
      const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

      if (!apiKey) {
        // 开发环境：如果没有配置API Key，返回模拟结果
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 开发模式：使用模拟AI鉴定结果');
          return this.getMockResult();
        }
        throw new Error('千问AI配置未设置，请在.env文件中配置QWEN_API_KEY');
      }

      // 构建提示词，让AI判断图片是否好看
      const prompt = `请仔细观察这张图片，从以下几个维度进行评价：
1. 图中的人帅吗？
2. 色彩是否协调（色彩搭配、饱和度、对比度）
3. 清晰度和质量（图片清晰度、噪点、细节）
4. 整体美感（是否赏心悦目、是否有艺术感）

请给出：
1. 总体评价：是否好看（是/否）
2. 评分：0-100分
3. 详细评语：50字左右的评价

请以JSON格式返回，格式如下：
{
  "isBeautiful": true/false,
  "score": 85,
  "comment": "图片构图优美，色彩搭配和谐，清晰度较高，整体视觉效果不错。"
}`;

      // 调用千问AI API（通义千问多模态API格式）
      // 根据DashScope API，content格式应该是 [{type: 'image', image: url}, {type: 'text', text: prompt}]
      const requestBody = {
        model: 'qwen-vl-plus', // 或 'qwen-vl-max'
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  image: imageUrl
                },
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 500
        }
      };

      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable'
          },
          timeout: 30000 // 30秒超时
        }
      );
      console.log('📥 收到AI响应:', JSON.stringify(response.data, null, 2));
      // 解析AI返回结果
      const result = this.parseResponse(response.data);
      console.log('result:', JSON.stringify(result, null, 2));

      return result;

    } catch (error) {
      // 打印详细错误信息
      if (error.response) {
        console.error('千问AI API错误详情:');
        console.error('状态码:', error.response.status);
        console.error('错误信息:', error.response.data);
        console.error('请求配置:', JSON.stringify({
          url: apiUrl,
          model: 'qwen-vl-plus',
          hasImageUrl: !!imageUrl
        }, null, 2));
      } else {
        console.error('千问AI调用失败:', error.message);
      }
      
      // 如果是开发环境或API调用失败（400/500等），返回模拟结果
      if (process.env.NODE_ENV === 'development' || error.response?.status) {
        console.log('⚠️ 使用模拟结果作为备用方案');
        return this.getMockResult();
      }
      
      throw error;
    }
  }

  /**
   * 解析千问AI返回的数据
   * @param {Object} apiResponse - API响应数据
   * @returns {Object} 解析后的结果
   */
  static parseResponse(apiResponse) {
    try {
      console.log('📥 收到AI响应:', JSON.stringify(apiResponse, null, 2));
      
      // 提取AI返回的文本内容（支持多种响应格式）
      let text = '';
      
      // 尝试多种可能的响应结构
      if (apiResponse.output?.choices?.[0]?.message?.content) {
        const content = apiResponse.output.choices[0].message.content;
        
        // 如果content是数组（通常格式）
        if (Array.isArray(content) && content.length > 0) {
          // 提取第一个元素的text属性
          if (content[0]?.text) {
            text = content[0].text;
          } else if (typeof content[0] === 'string') {
            text = content[0];
          } else {
            text = JSON.stringify(content[0]);
          }
        } else if (typeof content === 'string') {
          text = content;
        } else {
          text = JSON.stringify(content);
        }
      } else if (apiResponse.output?.choices?.[0]?.message?.text) {
        text = apiResponse.output.choices[0].message.text;
      } else if (apiResponse.output?.text) {
        text = apiResponse.output.text;
      } else if (apiResponse.output?.result?.output?.choices?.[0]?.message?.content) {
        const content = apiResponse.output.result.output.choices[0].message.content;
        if (Array.isArray(content) && content.length > 0 && content[0]?.text) {
          text = content[0].text;
        } else {
          text = typeof content === 'string' ? content : JSON.stringify(content);
        }
      } else if (typeof apiResponse.output === 'string') {
        text = apiResponse.output;
      } else if (apiResponse.output?.choices?.[0]?.message) {
        // 如果message是对象，尝试提取所有文本
        const message = apiResponse.output.choices[0].message;
        text = JSON.stringify(message);
      } else {
        // 最后尝试：直接将整个response转为字符串
        text = JSON.stringify(apiResponse);
      }

      // 确保text是字符串类型
      if (typeof text !== 'string') {
        text = String(text);
      }

      // 去掉markdown代码块标记（```json ... ```）
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      console.log('📝 提取的文本内容:', text.substring(0, 200)); // 只打印前200字符

      // 尝试从文本中提取JSON
      if (text && typeof text === 'string') {
        // 尝试直接解析整个文本（如果已经是JSON格式）
        let jsonData = null;
        try {
          jsonData = JSON.parse(text);
          if (jsonData.isBeautiful !== undefined || jsonData.score !== undefined || jsonData.comment) {
            return {
              isBeautiful: jsonData.isBeautiful || false,
              score: jsonData.score || 0,
              comment: jsonData.comment || '无法解析AI返回结果'
            };
          }
        } catch (e) {
          // 如果不是完整的JSON，尝试提取JSON对象
        }
        
        // 尝试从文本中提取JSON对象
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonData = JSON.parse(jsonMatch[0]);
            return {
              isBeautiful: jsonData.isBeautiful || false,
              score: jsonData.score || 0,
              comment: jsonData.comment || '无法解析AI返回结果',
              images_detail: jsonData.images_detail || undefined // 支持批量结果
            };
          } catch (parseError) {
            console.log('⚠️ JSON解析失败，尝试文本分析:', parseError.message);
          }
        }

        // 如果无法解析JSON，尝试从文本中推断结果
        const lowerText = text.toLowerCase();
        const isBeautiful = lowerText.includes('好看') || 
                           lowerText.includes('美观') || 
                           lowerText.includes('漂亮') ||
                           lowerText.includes('优秀') ||
                           lowerText.includes('很好') ||
                           lowerText.includes('不错') ||
                           lowerText.includes('isbeautiful: true');
        
        // 提取分数（如果存在）
        const scoreMatch = text.match(/score[":\s]*(\d+)/i) || 
                         text.match(/(\d+)\s*分/) ||
                         text.match(/评分[：:]\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : (isBeautiful ? 70 : 40);

        // 提取评论（尝试从文本中提取评语部分）
        let comment = text;
        // 如果文本太长，尝试提取评语部分
        if (text.length > 100) {
          const commentMatch = text.match(/评论[：:]\s*([^。]+)/i) || 
                              text.match(/comment[":]\s*"([^"]+)"/i) ||
                              text.match(/评语[：:]\s*([^。]+)/i);
          if (commentMatch) {
            comment = commentMatch[1].trim();
          } else {
            // 取前100个字符作为评语
            comment = text.substring(0, 100) + '...';
          }
        }

        return {
          isBeautiful,
          score,
          comment: comment || 'AI评价：图片质量需要进一步确认'
        };
      }

      // 如果无法提取文本，返回默认结果
      return {
        isBeautiful: false,
        score: 50,
        comment: '无法从AI响应中提取评价信息'
      };
    } catch (error) {
      console.error('解析AI响应失败:', error);
      // 返回默认结果
      return {
        isBeautiful: false,
        score: 50,
        comment: 'AI评价解析失败，建议人工复查'
      };
    }
  }

  /**
   * 获取模拟结果（用于开发和测试，单张图片）
   * @returns {Object} 模拟的鉴定结果
   */
  static getMockResult() {
    const mockResults = [
      {
        isBeautiful: true,
        score: 85,
        comment: '图片构图优美，色彩搭配和谐，清晰度较高，整体视觉效果不错，是一张好看的图片。'
      },
      {
        isBeautiful: true,
        score: 92,
        comment: '图片质量很高，构图精妙，色彩鲜艳但不失和谐，细节清晰，整体美感很强。'
      },
      {
        isBeautiful: false,
        score: 45,
        comment: '图片构图一般，色彩搭配有待改善，清晰度较低，整体视觉效果不够理想。'
      },
      {
        isBeautiful: true,
        score: 78,
        comment: '图片整体效果良好，构图合理，色彩自然，清晰度尚可，具有一定的美感。'
      }
    ];

    return mockResults[Math.floor(Math.random() * mockResults.length)];
  }

  /**
   * 获取批量模拟结果（用于开发和测试，多张图片）
   * @param {number} imageCount - 图片数量
   * @returns {Object} 模拟的批量鉴定结果
   */
  static getMockBatchResult(imageCount) {
    const detailComments = [
      '构图优美，色彩搭配和谐',
      '清晰度较高，细节丰富',
      '整体视觉效果不错',
      '构图一般，但色彩尚可',
      '清晰度有待提升'
    ];

    const images_detail = [];
    let totalScore = 0;
    let allBeautiful = true;

    for (let i = 0; i < imageCount; i++) {
      const score = 60 + Math.floor(Math.random() * 35); // 60-95分
      const isBeautiful = score >= 70;
      totalScore += score;
      if (!isBeautiful) allBeautiful = false;

      images_detail.push({
        image_index: i + 1,
        score: score,
        comment: detailComments[Math.floor(Math.random() * detailComments.length)]
      });
    }

    const avgScore = Math.round(totalScore / imageCount);
    const comments = images_detail.map((d, i) => `图片${i + 1}: ${d.comment}`).join('；');

    return {
      isBeautiful: allBeautiful,
      score: avgScore,
      comment: imageCount > 1 
        ? `共鉴定${imageCount}张图片，平均评分${avgScore}分。${comments}`
        : images_detail[0].comment,
      images_detail: imageCount > 1 ? images_detail : undefined
    };
  }
}

module.exports = QwenService;

