const pool = require('../config/database');
const Response = require('../utils/response');
const QwenService = require('../services/qwenService');

class AppraisalController {
  // 创建鉴定记录
  static async create(req, res) {
    try {
      const { card_name, card_image, status = 'pending' } = req.body;

      if (!card_image) {
        return Response.error(res, '缺少图片URL', -1, 400);
      }

      // 支持单个图片URL或图片数组
      const imageArray = Array.isArray(card_image) ? card_image : [card_image];
      
      if (imageArray.length === 0) {
        return Response.error(res, '图片数组不能为空', -1, 400);
      }

      console.log(`🔍 开始调用千问AI进行图片鉴定，共 ${imageArray.length} 张图片（一次性提交）...`);
      
      // 一次性提交所有图片给AI进行综合判断
      let aiResult;
      try {
        aiResult = await QwenService.judgeImages(imageArray);
        console.log('✅ 千问AI批量鉴定完成:', aiResult);
      } catch (error) {
        console.error('❌ 千问AI批量调用失败:', error.message);
        // AI调用失败时，使用备用结果
        aiResult = {
          isBeautiful: false,
          score: 0,
          comment: 'AI鉴定服务暂时不可用，请稍后重试',
          images_detail: imageArray.map((url, i) => ({
            image_index: i + 1,
            image_url: url,
            score: 0,
            comment: '鉴定失败'
          }))
        };
      }

      // 处理AI返回的结果，补充图片URL
      if (aiResult.images_detail && Array.isArray(aiResult.images_detail)) {
        aiResult.images_detail = aiResult.images_detail.map((detail, i) => ({
          ...detail,
          image_url: imageArray[detail.image_index - 1] || imageArray[i] || ''
        }));
      } else if (imageArray.length > 1) {
        // 如果AI没有返回详细结果，但有多张图片，创建一个默认的详细结果
        aiResult.images_detail = imageArray.map((url, i) => ({
          image_index: i + 1,
          image_url: url,
          score: aiResult.score,
          comment: `图片${i + 1}: ${aiResult.comment.split('；')[i] || aiResult.comment}`
        }));
      }

      // 生成鉴定结果描述
      const avgScore = aiResult.score || 0;
      const allBeautiful = aiResult.isBeautiful || false;
      const overallComment = aiResult.comment || '无评价';
      
      const result = allBeautiful 
        ? `所有图片质量优秀（评分：${avgScore}分）- ${overallComment}`
        : `图片质量${avgScore >= 70 ? '良好' : '一般'}（评分：${avgScore}分）- ${overallComment}`;

      // 保存鉴定结果到数据库（如果有用户信息则保存，否则user_id设为null）
      // const userId = req.user?.userId || null;
      // const imageUrlsString = Array.isArray(card_image) ? JSON.stringify(card_image) : card_image;
      // const [insertResult] = await pool.query(
      //   'INSERT INTO appraisals (user_id, card_name, card_image, status, result) VALUES (?, ?, ?, ?, ?)',
      //   [userId, card_name || '未命名卡片', imageUrlsString, status, result]
      // );

      return Response.success(res, {
        // id: insertResult.insertId,
        card_name: card_name || '未命名卡片',
        card_image: imageArray, // 统一返回数组格式
        status,
        result,
        ai_judgment: {
          isBeautiful: aiResult.isBeautiful || false,
          score: aiResult.score || 0,
          comment: aiResult.comment || '无评价',
          total_images: imageArray.length,
          images_detail: aiResult.images_detail || imageArray.map((url, i) => ({
            image_index: i + 1,
            image_url: url,
            score: aiResult.score || 0,
            comment: aiResult.comment || '无评价'
          }))
        }
      }, '鉴定成功');
    } catch (error) {
      console.error('创建鉴定记录失败:', error);
      return Response.error(res, '鉴定失败: ' + error.message, -1, 500);
    }
  }

  // 获取鉴定记录列表
  static async getList(req, res) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;

      const [records] = await pool.query(
        `SELECT id, card_name, card_image, result, status, created_at 
         FROM appraisals 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [req.user.userId, parseInt(pageSize), parseInt(offset)]
      );

      const [countResult] = await pool.query(
        'SELECT COUNT(*) as total FROM appraisals WHERE user_id = ?',
        [req.user.userId]
      );

      return Response.success(res, {
        list: records,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (error) {
      console.error('获取鉴定记录失败:', error);
      return Response.error(res, '获取失败');
    }
  }

  // 获取鉴定记录详情
  static async getDetail(req, res) {
    try {
      const { id } = req.params;

      const [records] = await pool.query(
        'SELECT * FROM appraisals WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (records.length === 0) {
        return Response.error(res, '记录不存在', -1, 404);
      }

      return Response.success(res, records[0]);
    } catch (error) {
      console.error('获取鉴定详情失败:', error);
      return Response.error(res, '获取失败');
    }
  }

  // 删除鉴定记录
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const [result] = await pool.query(
        'DELETE FROM appraisals WHERE id = ? AND user_id = ?',
        [id, req.user.userId]
      );

      if (result.affectedRows === 0) {
        return Response.error(res, '记录不存在', -1, 404);
      }

      return Response.success(res, null, '删除成功');
    } catch (error) {
      console.error('删除鉴定记录失败:', error);
      return Response.error(res, '删除失败');
    }
  }
}

module.exports = AppraisalController;

