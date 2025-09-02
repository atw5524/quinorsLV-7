// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const ocrRoutes = require('./routes/ocr')
const addressRoutes = require('./routes/address');

const app = express();

// 보안 미들웨어 (CORS 전에 설정)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS 설정 - 더 관대한 설정
const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // 허용할 origins 목록
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://quinors-lv-backend.ngrok.io',
      'https://www.quinors-lv.ngrok.dev'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Preflight 요청 처리
app.options('*', cors(corsOptions));

// 전역 Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // 개발 중에는 높게 설정
  message: {
    success: false,
    message: '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어 (개발용)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check 요청 받음');
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Quinors LV Backend API',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/admin/stats',
      '/api/ocr/google-vision',
      '/api/ocr/test',
      '/api/address/convert-to-dong',
      '/api/address/search',         
      '/api/address/test-kakao'      
    ]
  });
});

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/address', addressRoutes);

// 404 핸들러
app.use('*', (req, res) => {
  console.log(`❌ 404 - 경로를 찾을 수 없음: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API 엔드포인트를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/admin/stats',
      'POST /api/ocr/google-vision',
      'GET /api/ocr/test'
    ]
  });
});

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('서버 에러:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '서버 오류가 발생했습니다.' 
      : error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB 연결 성공');
})
.catch((error) => {
  console.error('❌ MongoDB 연결 실패:', error);
  process.exit(1);
});

const PORT = process.env.PORT || 5480;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 External Access: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/admin/stats`);
});

module.exports = app;