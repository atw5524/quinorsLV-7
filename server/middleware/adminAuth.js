// server/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
  try {
    // auth 미들웨어에서 설정한 사용자 정보 확인
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }

    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    console.log('✅ 관리자 권한 확인 완료:', req.user.user_id);
    next();

  } catch (error) {
    console.error('❌ 관리자 권한 확인 실패:', error);
    res.status(500).json({
      success: false,
      message: '권한 확인 중 오류가 발생했습니다.'
    });
  }
};

module.exports = adminAuth;