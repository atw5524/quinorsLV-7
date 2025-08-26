const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 개선된 인증 미들웨어
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '액세스 토큰이 필요합니다.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // 사용자 존재 및 활성 상태 확인 (새로운 User 스키마 사용)
    const User = require('../models/User');
    const user = await User.findByUserId(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: '유효하지 않은 사용자입니다.'
      });
    }

    // 계정 잠금 상태 확인 (가상 필드 사용)
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: '계정이 잠겨있습니다.'
      });
    }

    req.user = decoded;
    req.userModel = user; // 필요시 전체 사용자 모델 접근 가능
    next();

  } catch (err) {
    return res.status(403).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }
  next();
};

// 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // 토큰이 없어도 통과
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const User = require('../models/User');
    const user = await User.findByUserId(decoded.userId);

    if (user && user.isActive && !user.isLocked) {
      req.user = decoded;
      req.userModel = user;
    }
  } catch (err) {
    // 토큰이 유효하지 않아도 통과 (로그만 남김)
    console.log('선택적 인증 실패:', err.message);
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};