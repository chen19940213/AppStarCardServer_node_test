// 统一响应格式
class Response {
  static success(res, data, message = '操作成功') {
    return res.json({
      code: 0,
      message,
      data
    });
  }

  static error(res, message = '操作失败', code = -1, statusCode = 500) {
    return res.status(statusCode).json({
      code,
      message
    });
  }
}

module.exports = Response;

