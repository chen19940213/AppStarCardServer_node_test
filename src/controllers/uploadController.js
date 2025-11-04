const Response = require('../utils/response');
const fs = require('fs');
const path = require('path');

class UploadController {
  static async uploadImage(req, res) {
    try {
      let fileInfo = null;

      // 处理base64格式的图片
      if (req.body && req.body.file && typeof req.body.file === 'string') {
        const base64Data = req.body.file;
        
        // 检测base64格式（可能包含data:image/png;base64,前缀）
        let base64String = base64Data;
        let mimeType = 'image/png';
        
        if (base64Data.startsWith('data:')) {
          const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64String = matches[2];
          } else {
            return Response.error(res, '无效的base64格式', -1, 400);
          }
        }
        
        // 从mime类型确定文件扩展名
        const extMap = {
          'image/png': '.png',
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/gif': '.gif',
          'image/webp': '.webp'
        };
        const ext = extMap[mimeType] || '.png';
        
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + ext;
        const filepath = path.join('uploads', filename);
        
        // 估算base64字符串对应的文件大小（base64编码后大小约为原始的4/3）
        // 为了更准确，先解码检查实际大小
        const buffer = Buffer.from(base64String, 'base64');
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        // 检查文件大小
        if (buffer.length > maxSize) {
          return Response.error(res, `图片大小超过限制，最大允许10MB，当前大小：${(buffer.length / 1024 / 1024).toFixed(2)}MB`, -1, 400);
        }
        
        // 确保uploads目录存在
        if (!fs.existsSync('uploads')) {
          fs.mkdirSync('uploads', { recursive: true });
        }
        
        // 写入文件
        fs.writeFileSync(filepath, buffer);
        
        fileInfo = {
          filename: filename,
          size: buffer.length,
          mimetype: mimeType,
          path: filepath
        };
      }
      // 处理multer上传的文件（传统方式）
      else if (req.file) {
        fileInfo = {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        };
      }
      else {
        return Response.error(res, '没有上传文件或文件数据', -1, 400);
      }

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${fileInfo.filename}`;

      return Response.success(res, {
        url: imageUrl,
        filename: fileInfo.filename,
        size: fileInfo.size
      }, '上传成功');
    } catch (error) {
      console.error('上传失败:', error);
      return Response.error(res, '上传失败: ' + error.message, -1, 500);
    }
  }
}

module.exports = UploadController;

