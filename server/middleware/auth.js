// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '액세스 토큰이 없습니다.'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔑 JWT 디코딩 결과:', decoded);
      
      // 사용자 존재 확인
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '유효하지 않은 토큰입니다.'
        });
      }

      // 계정 상태 확인
      if (user.status !== 'approved' || user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: '계정이 비활성화되었습니다.'
        });
      }

      // ✅ req.user에 id 필드 추가 (profile API에서 사용)
      req.user = {
        id: decoded.userId,           // ← 이 부분이 핵심!
        userId: decoded.userId,
        user_id: decoded.user_id,
        role: decoded.role,
        // 추가 사용자 정보도 포함
        charge_name: user.charge_name,
        cust_name: user.cust_name,
        dept_name: user.dept_name,
        department: user.department
      };

      console.log('✅ 인증 성공 - 사용자 정보:', {
        id: req.user.id,
        userId: req.user.userId,
        user_id: req.user.user_id,
        role: req.user.role
      });

      next();
    } catch (jwtError) {
      console.error('JWT 검증 오류:', jwtError);
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

  } catch (error) {
    console.error('인증 미들웨어 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

module.exports = auth;