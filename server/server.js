const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// 설정 및 유틸리티 import
const config = require('./config/config');
const connectDB = require('./config/database');
const { notFoundHandler, globalErrorHandler, setupProcessHandlers } = require('./middleware/errorHandler');

// 라우트 import
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

console.log('🚀 서버 초기화 시작...');

// ===== 기본 미들웨어 설정 =====

// 보안 미들웨어
app.use(helmet());
app.use(compression());

// CORS 설정
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));

// OPTIONS 요청 처리
app.options('*', cors());

// Rate limiting 설정
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.LOGIN_MAX,
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting 적용
app.use(limiter);

// 신뢰할 수 있는 프록시 설정 (ngrok 등 사용 시)
app.set('trust proxy', 1);

// Body parser 설정
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: '잘못된 JSON 형식입니다.'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// 요청 로깅 미들웨어 (개발 환경)
if (config.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;
    
    console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`);
    
    // 응답 시간 측정
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${method} ${url} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });
}

// ===== 데이터베이스 연결 =====
connectDB();

// ===== 기본 라우트 =====

// 서버 상태 확인
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.json({
    success: true,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      environment: config.NODE_ENV,
      database: {
        status: dbStatusMap[dbStatus],
        uri: config.MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // 비밀번호 마스킹
      },
      server: {
        port: config.PORT,
        cors: config.CORS_ORIGINS,
        rateLimit: {
          windowMs: config.RATE_LIMIT.WINDOW_MS,
          maxRequests: config.RATE_LIMIT.MAX_REQUESTS
        }
      }
    }
  });
});

// API 문서 (개발 환경에서만)
if (config.NODE_ENV === 'development') {
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Quinors LV API Server',
      version: '3.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/login': '로그인',
          'POST /api/auth/register': '회원가입 신청',
          'PUT /api/auth/change-password': '비밀번호 변경',
          'GET /api/auth/me': '사용자 정보 조회'
        },
        admin: {
          'GET /api/admin/stats': '통계 조회',
          'GET /api/admin/requests': '가입신청 목록',
          'PUT /api/admin/requests/:id/approve': '가입신청 승인',
          'PUT /api/admin/requests/:id/reject': '가입신청 반려',
          'GET /api/admin/stores': '매장 목록',
          'POST /api/admin/stores': '매장 등록',
          'PUT /api/admin/stores/:id': '매장 수정',
          'DELETE /api/admin/stores/:id': '매장 삭제',
          'GET /api/admin/users': '회원 목록',
          'PUT /api/admin/users/:id': '회원정보 수정',
          'PUT /api/admin/users/:id/status': '계정 활성화/비활성화',
          'POST /api/admin/users/:id/reset-password': '비밀번호 초기화'
        }
      }
    });
  });
}

// ===== API 라우트 연결 =====

// 인증 관련 라우트 (로그인 제한 적용)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// 관리자 전용 라우트
app.use('/api/admin', adminRoutes);

// ===== 정적 파일 서빙 (필요시) =====
// app.use('/uploads', express.static('uploads'));

// ===== 에러 핸들링 =====

// 404 에러 핸들러
app.use('*', notFoundHandler);

// 전역 에러 핸들러
app.use(globalErrorHandler);

// ===== 서버 시작 =====

const server = app.listen(config.PORT, () => {
  console.log('');
  console.log('🎉 ===============================================');
  console.log('🚀 Quinors LV Backend Server Started Successfully!');
  console.log('🎉 ===============================================');
  console.log('');
  console.log(`📡 서버 주소: http://localhost:${config.PORT}`);
  console.log(`📱 프론트엔드: http://localhost:3000`);
  console.log(`💾 데이터베이스: ${config.MONGODB_URI}`);
  console.log(`🌟 실행 환경: ${config.NODE_ENV}`);
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log('');
  console.log('📋 사용 가능한 API 엔드포인트:');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  🔑 인증 관련                                    │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  POST /api/auth/login           - 로그인         │');
  console.log('│  POST /api/auth/register        - 회원가입 신청   │');
  console.log('│  PUT  /api/auth/change-password - 비밀번호 변경   │');
  console.log('│  GET  /api/auth/me              - 사용자 정보     │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  👨‍💼 관리자 관련                                 │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  GET  /api/admin/stats          - 통계 조회      │');
  console.log('│  GET  /api/admin/requests       - 가입신청 목록   │');
  console.log('│  PUT  /api/admin/requests/:id/approve - 신청승인 │');
  console.log('│  PUT  /api/admin/requests/:id/reject  - 신청반려 │');
  console.log('│  GET  /api/admin/stores         - 매장 목록      │');
  console.log('│  POST /api/admin/stores         - 매장 등록      │');
  console.log('│  PUT  /api/admin/stores/:id     - 매장 수정      │');
  console.log('│  DEL  /api/admin/stores/:id     - 매장 삭제      │');
  console.log('│  GET  /api/admin/users          - 회원 목록      │');
  console.log('│  PUT  /api/admin/users/:id      - 회원정보 수정   │');
  console.log('│  PUT  /api/admin/users/:id/status - 계정상태변경 │');
  console.log('│  POST /api/admin/users/:id/reset-password - 비밀번호초기화 │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
  console.log('🔧 개발 도구:');
  console.log(`   • 서버 상태: GET http://localhost:${config.PORT}/api/health`);
  console.log(`   • API 문서:  GET http://localhost:${config.PORT}/api`);
  console.log('');
  console.log('✅ 서버가 성공적으로 시작되었습니다!');
  console.log('');
});

// 서버 인스턴스 에러 핸들링
server.on('error', (error) => {
  console.error('❌ 서버 시작 실패:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`포트 ${config.PORT}이 이미 사용 중입니다.`);
    console.error('다른 프로세스를 종료하거나 다른 포트를 사용하세요.');
  } else if (error.code === 'EACCES') {
    console.error(`포트 ${config.PORT}에 대한 권한이 없습니다.`);
    console.error('관리자 권한으로 실행하거나 1024 이상의 포트를 사용하세요.');
  }
  
  process.exit(1);
});

// ===== Graceful Shutdown 처리 =====

const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 ${signal} 신호 수신 - 서버 종료 중...`);
  
  // 새로운 연결 차단
  server.close(async () => {
    console.log('✅ HTTP 서버가 정상적으로 종료되었습니다.');
    
    try {
      // 데이터베이스 연결 종료
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('✅ MongoDB 연결이 정상적으로 종료되었습니다.');
      
      // 기타 정리 작업
      console.log('✅ 모든 리소스가 정리되었습니다.');
      console.log('👋 서버를 종료합니다. 안녕히 가세요!');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ 서버 종료 중 오류:', error);
      process.exit(1);
    }
  });

  // 강제 종료 타이머 (30초)
  setTimeout(() => {
    console.error('❌ 강제 종료 - 정상 종료 시간 초과 (30초)');
    process.exit(1);
  }, 30000);
};

// 시그널 핸들러 등록
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 프로세스 레벨 에러 핸들러 설정
setupProcessHandlers();

// Windows에서 Ctrl+C 처리
if (process.platform === 'win32') {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// 메모리 사용량 모니터링 (개발 환경)
if (config.NODE_ENV === 'development') {
  setInterval(() => {
    const used = process.memoryUsage();
    const usage = {};
    for (let key in used) {
      usage[key] = Math.round(used[key] / 1024 / 1024 * 100) / 100 + ' MB';
    }
    console.log('💾 메모리 사용량:', usage);
  }, 300000); // 5분마다
}

module.exports = app;