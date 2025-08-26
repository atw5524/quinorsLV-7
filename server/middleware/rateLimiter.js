const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// 일반 요청 제한
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
  }
});

// 로그인 제한
const loginLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.LOGIN_MAX,
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
  }
});

module.exports = {
  limiter,
  loginLimiter
};