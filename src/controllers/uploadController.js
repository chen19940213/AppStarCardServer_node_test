const Response = require('../utils/response');

class UploadController {
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return Response.error(res, '没有上传文件', -1, 400);
      }

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      return Response.success(res, {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      }, '上传成功');
    } catch (error) {
      console.error('上传失败:', error);
      return Response.error(res, '上传失败');
    }
  }
}

module.exports = UploadController;

