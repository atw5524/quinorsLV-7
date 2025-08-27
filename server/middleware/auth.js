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

      req.user = {
        userId: decoded.userId,
        user_id: decoded.user_id,
        role: decoded.role
      };

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