const Response = require('../utils/response');
const UserController = require('./userController');
const AppraisalController = require('./appraisalController');
const UploadController = require('./uploadController');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Action 映射表：action -> { controller, method, needAuth }
const actionMap = {
  // 用户相关
  'user.wechat.login': {
    controller: UserController,
    method: 'login',
    needAuth: false
  },
  'user.login': {
    controller: UserController,
    method: 'login',
    needAuth: false
  },
  'user.info': {
    controller: UserController,
    method: 'getUserInfo',
    needAuth: true
  },
  'user.update': {
    controller: UserController,
    method: 'updateUserInfo',
    needAuth: true
  },
  
  // 鉴定相关
  'appraisal.create': {
    controller: AppraisalController,
    method: 'create',
    needAuth: false
  },
  'appraisal.list': {
    controller: AppraisalController,
    method: 'getList',
    needAuth: true
  },
  'appraisal.detail': {
    controller: AppraisalController,
    method: 'getDetail',
    needAuth: true,
    hasParams: true
  },
  'appraisal.delete': {
    controller: AppraisalController,
    method: 'delete',
    needAuth: true,
    hasParams: true
  },
  'upload.image': {
    controller: UploadController,
    method: 'uploadImage',
    needBase64: true // 标记需要处理base64图片
  }
};

// 路由映射表：path -> { controller, method, needAuth }
const routeMap = {
  // 用户相关路由
  'user/login': {
    controller: UserController,
    method: 'login',
    needAuth: false,
    httpMethod: 'POST'
  },
  'user/info': {
    controller: UserController,
    method: 'getUserInfo',
    needAuth: true,
    httpMethod: 'GET'
  },
  'user/update': {
    controller: UserController,
    method: 'updateUserInfo',
    needAuth: true,
    httpMethod: 'POST'
  },
  
  // 鉴定相关路由
  'appraisal/create': {
    controller: AppraisalController,
    method: 'create',
    httpMethod: 'POST'
  },
  'appraisal/list': {
    controller: AppraisalController,
    method: 'getList',
    needAuth: true,
    httpMethod: 'GET'
  },
  'appraisal/detail': {
    controller: AppraisalController,
    method: 'getDetail',
    needAuth: true,
    httpMethod: 'GET',
    hasParams: true // 需要从 data 中获取 id
  },
  'appraisal/delete': {
    controller: AppraisalController,
    method: 'delete',
    needAuth: true,
    httpMethod: 'DELETE',
    hasParams: true
  },
  
  // 上传相关路由
  'upload/image': {
    controller: UploadController,
    method: 'uploadImage',
    needAuth: true,
    httpMethod: 'POST',
    needFile: true // 文件上传特殊处理
  }
};

class RouterController {
  // 统一路由入口
  static async route(req, res) {
    try {
      console.log('🔧 统一路由收到请求:', req.method, req.path);
      console.log('🔧 请求体:', JSON.stringify(req.body));
      
      const body = req.body || {};
      let routeConfig = null;
      let requestData = {};
      
      // 支持两种格式：
      // 1. action 格式: { action: "user.wechat.login", code: "...", ... }
      // 2. path 格式: { path: "user/login", data: {...}, params: {...} }
      
      if (body.action) {
        // Action 格式
        const action = body.action;
        routeConfig = actionMap[action];
        
        if (!routeConfig) {
          return Response.error(res, `Action不存在: ${action}`, -1, 404);
        }
        
        // 将 action 参数外的其他字段作为请求数据
        const { action: _, ...rest } = body;
        requestData = rest;
        
      } else if (body.path) {
        // Path 格式（原有格式）
        const { path, data = {}, params = {} } = body;
        routeConfig = routeMap[path];
        
        if (!routeConfig) {
          return Response.error(res, `路由不存在: ${path}`, -1, 404);
        }
        
        requestData = data;
      } else {
        return Response.error(res, '缺少action或path参数', -1, 400);
      }

      // 处理需要认证的路由
      if (routeConfig.needAuth) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
          return Response.error(res, '未提供认证令牌', -1, 401);
        }

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = decoded; // 设置用户信息供后续使用
        } catch (err) {
          return Response.error(res, '令牌无效或已过期', -1, 403);
        }
      }

      // 构造模拟的请求对象
      const mockReq = {
        body: requestData,
        query: body.params?.query || {},
        params: routeConfig.hasParams ? { 
          id: body.params?.id || requestData.id 
        } : {},
        user: req.user || null, // 认证后的用户信息
        file: req.file || null, // 文件上传
        protocol: req.protocol || 'http',
        get: req.get ? req.get.bind(req) : function(header) { return req.headers[header?.toLowerCase()] || null; }
      };

      // 调用对应的控制器方法
      const controller = routeConfig.controller;
      const method = routeConfig.method;

      if (!controller || !controller[method]) {
        return Response.error(res, `控制器方法不存在: ${method}`, -1, 500);
      }

      // 执行控制器方法
      await controller[method](mockReq, res);

    } catch (error) {
      console.error('路由分发失败:', error);
      return Response.error(res, '路由分发失败: ' + error.message, -1, 500);
    }
  }
}

module.exports = RouterController;

