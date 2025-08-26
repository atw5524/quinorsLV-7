require('dotenv').config();

const config = {
  // 서버 설정
  PORT: process.env.PORT || 5480,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 데이터베이스
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv',
  
  // JWT 설정
  JWT_SECRET: process.env.JWT_SECRET || 'q1u2i1n@o!r%%s123912jdn1d219c1nc1n2j12',
  JWT_EXPIRES_IN: '24h',
  
  // CORS 설정
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3003',
    'https://www.quinors-lv.ngrok.dev'
  ],
  
  // Rate Limiting 설정
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15분
    MAX_REQUESTS: 1000,
    LOGIN_MAX: 10
  }
};

module.exports = config;