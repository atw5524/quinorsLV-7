const config = require('../config/config');

// 404 에러 핸들러
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.originalUrl
  });
};

// 전역 에러 핸들러
const globalErrorHandler = (error, req, res, next) => {
  console.error('전역 에러:', error);

  // Mongoose 검증 에러
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: '입력 데이터 검증 실패',
      errors: errors
    });
  }

  // Mongoose 중복 키 에러
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `이미 존재하는 ${field}입니다.`,
      field: field
    });
  }

  // JWT 에러
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '토큰이 만료되었습니다.'
    });
  }

  // MongoDB 연결 에러
  if (error.name === 'MongoError') {
    return res.status(503).json({
      success: false,
      message: '데이터베이스 연결 오류입니다.'
    });
  }

  // 기본 에러 응답
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '서버 내부 오류가 발생했습니다.',
    ...(config.NODE_ENV === 'development' && { 
      stack: error.stack,
      error: error 
    })
  });
};

// 비동기 에러 캐치 래퍼
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 프로세스 레벨 에러 핸들러 설정
const setupProcessHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('처리되지 않은 Promise 거부:', reason);
    console.error('위치:', promise);
  });

  process.on('uncaughtException', (error) => {
    console.error('처리되지 않은 예외:', error);
    process.exit(1);
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  setupProcessHandlers
};