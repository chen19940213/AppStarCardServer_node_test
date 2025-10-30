const pool = require('../config/database');
const Response = require('../utils/response');

class AppraisalController {
  // 创建鉴定记录
  static async create(req, res) {
    try {
      const { card_name, card_image, status = 'pending' } = req.body;

      if (!card_image) {
        return Response.error(res, '缺少图片URL', -1, 400);
      }

      // 模拟AI鉴定结果
      const mockResults = ['符合正品特征', '疑似仿品', '需要进一步鉴定'];
      const result = mockResults[Math.floor(Math.random() * mockResults.length)];

      const [insertResult] = await pool.query(
        'INSERT INTO appraisals (user_id, card_name, card_image, status, result) VALUES (?, ?, ?, ?, ?)',
        [req.user.userId, card_name || '未命名卡片', card_image, status, result]
      );

      return Response.success(res, {
        id: insertResult.insertId,
        card_name: card_name || '未命名卡片',
        card_image,
        status,
        result
      }, '鉴定成功');
    } catch (error) {
      console.error('创建鉴定记录失败:', error);
      return Response.error(res, '鉴定失败');
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

