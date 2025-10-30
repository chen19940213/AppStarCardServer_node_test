const axios = require('axios');

class WechatService {
  /**
   * 微信小程序登录 - 通过code获取openid和session_key
   * @param {string} code - 小程序wx.login()返回的code
   * @returns {Promise<{openid: string, session_key: string, unionid?: string}>}
   */
  static async code2Session(code) {
    try {
      const appid = process.env.WECHAT_APPID;
      const secret = process.env.WECHAT_SECRET;

      if (!appid || !secret) {
        throw new Error('微信配置未设置，请在.env文件中配置WECHAT_APPID和WECHAT_SECRET');
      }

      // 调用微信接口
      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const response = await axios.get(url, {
        params: {
          appid,
          secret,
          js_code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000 // 10秒超时
      });

      const { data } = response;

      // 检查错误
      if (data.errcode) {
        const errorMessages = {
          '40029': 'code无效',
          '45011': '接口调用频率超限',
          '40163': 'code已被使用',
          '-1': '系统繁忙',
        };
        const errorMsg = errorMessages[data.errcode] || `微信接口错误: ${data.errmsg}`;
        throw new Error(errorMsg);
      }

      // 返回结果
      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid // 如果有绑定开放平台账号
      };
    } catch (error) {
      console.error('微信登录失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取微信小程序access_token（用于其他接口调用）
   * @returns {Promise<string>} access_token
   */
  static async getAccessToken() {
    try {
      const appid = process.env.WECHAT_APPID;
      const secret = process.env.WECHAT_SECRET;

      const url = 'https://api.weixin.qq.com/cgi-bin/token';
      const response = await axios.get(url, {
        params: {
          grant_type: 'client_credential',
          appid,
          secret
        },
        timeout: 10000
      });

      const { data } = response;

      if (data.errcode) {
        throw new Error(`获取access_token失败: ${data.errmsg}`);
      }

      return data.access_token;
    } catch (error) {
      console.error('获取access_token失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查文本内容是否合规（内容安全检测）
   * @param {string} content - 要检测的文本内容
   * @param {string} accessToken - access_token
   * @returns {Promise<boolean>} 是否合规
   */
  static async checkContent(content, accessToken) {
    try {
      const url = 'https://api.weixin.qq.com/wxa/msg_sec_check';
      const response = await axios.post(
        `${url}?access_token=${accessToken}`,
        { content },
        { timeout: 10000 }
      );

      const { data } = response;

      // result.suggest: pass(合规), review(需人工审核), risky(违规)
      return data.result?.suggest === 'pass';
    } catch (error) {
      console.error('内容安全检测失败:', error.message);
      // 检测失败时默认通过，避免影响用户体验
      return true;
    }
  }
}

module.exports = WechatService;

