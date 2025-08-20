const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 모델 import
const AccountRequest = require('./models/AccountRequest');
const User = require('./models/User');

const app = express();

// ===== 미들웨어 설정 =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`\n📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('🔍 Params:', req.params);
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔍 Query:', req.query);
  }
  next();
});

// ===== MongoDB 연결 =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB 연결 성공 (quinors-lv 데이터베이스)');
})
.catch(err => {
  console.log('❌ MongoDB 연결 실패:', err.message);
});

// ===== 유틸리티 함수들 =====
const generateUserId = (storeCode) => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${storeCode.toUpperCase()}_${randomNum}`;
};

const generateTempPassword = () => {
  return Math.random().toString(36).slice(-8).toUpperCase();
};

// 클라이언트 정보 추출
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  };
};

// ===== 기본 라우트들 =====
app.get('/', async (req, res) => {
  try {
    const requestStats = await AccountRequest.getStats();
    const userStats = await User.getStats();
    
    res.json({
      success: true,
      message: '🚀 퀴노스 서버가 실행 중입니다!',
      timestamp: new Date().toISOString(),
      port: 5480,
      database: mongoose.connection.readyState === 1 ? 'MongoDB Connected (quinors-lv)' : 'MongoDB Disconnected',
      version: '2.0.0',
      stats: {
        requests: requestStats,
        users: userStats
      },
      endpoints: {
        accounts: '/api/account-requests',
        admin: '/api/admin/*',
        health: '/health'
      }
    });
  } catch (error) {
    res.json({
      success: true,
      message: '🚀 퀴노스 서버가 실행 중입니다!',
      database: 'MongoDB Error',
      error: error.message
    });
  }
});

// 헬스체크
app.get('/health', async (req, res) => {
  try {
    const requestCount = await AccountRequest.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({ 
      status: 'OK', 
      uptime: process.uptime(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      collections: {
        requests: requestCount,
        users: userCount
      },
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'error',
      error: error.message
    });
  }
});

// 서버 상태 확인
app.get('/api/status', async (req, res) => {
  try {
    const [totalRequests, pendingRequests, approvedRequests, rejectedRequests, totalUsers, activeUsers] = await Promise.all([
      AccountRequest.countDocuments(),
      AccountRequest.countDocuments({ status: 'pending' }),
      AccountRequest.countDocuments({ status: 'approved' }),
      AccountRequest.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      User.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      server: 'running',
      data: {
        requests: {
          total: totalRequests,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 상태 조회 중 오류가 발생했습니다.'
    });
  }
});

// ===== 계정 발급 관련 API =====

// 계정 발급 신청
app.post('/api/account-requests', async (req, res) => {
  try {
    console.log('\n🔍 === 계정 발급 신청 처리 시작 (MongoDB) ===');
    
    const { managerName, storeCode, phoneLast4 } = req.body || {};
    const clientInfo = getClientInfo(req);

    console.log('📝 추출된 데이터:');
    console.log(`  - managerName: "${managerName}"`);
    console.log(`  - storeCode: "${storeCode}"`);
    console.log(`  - phoneLast4: "${phoneLast4}"`);
    console.log(`  - IP: ${clientInfo.ipAddress}`);

    // 중복 신청 확인
    const existingRequest = await AccountRequest.findOne({
      storeCode: storeCode?.toUpperCase(),
      phoneLast4: phoneLast4,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      console.log('❌ 중복 신청 발견:', existingRequest._id);
      return res.status(400).json({
        success: false,
        message: '이미 신청된 정보입니다.',
        existingRequest: {
          id: existingRequest._id,
          status: existingRequest.status,
          requestDate: existingRequest.requestDate
        }
      });
    }

    // 새 신청 생성
    const newRequest = new AccountRequest({
      managerName,
      storeCode,
      phoneLast4,
      ...clientInfo
    });

    const savedRequest = await newRequest.save();

    console.log('✅ MongoDB에 신청 저장 완료:', savedRequest._id);

    res.status(201).json({
      success: true,
      message: '계정 발급 신청이 완료되었습니다.',
      data: {
        requestId: savedRequest._id,
        requestDate: savedRequest.requestDate,
        status: savedRequest.status
      }
    });

  } catch (error) {
    console.error('❌ 계정 신청 오류:', error);
    
    // Mongoose 유효성 검사 오류 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 올바르지 않습니다.',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 신청 상태 확인
app.get('/api/account-requests/status/:requestId', async (req, res) => {
  try {
    let { requestId } = req.params;
    
    // 파라미터 정리
    requestId = requestId.replace(/[\[\]]/g, '').trim();
    
    // ObjectId 유효성 검사
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.'
      });
    }

    const request = await AccountRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '신청 정보를 찾을 수 없습니다.'
      });
    }

    // 승인된 경우 생성된 사용자 정보도 함께 조회
    let userData = null;
    if (request.status === 'approved' && request.generatedUserId) {
      userData = await User.findOne({ userId: request.generatedUserId })
        .select('userId managerName storeCode isActive createdAt lastLogin');
    }

    res.json({
      success: true,
      data: {
        ...request.toObject(),
        user: userData
      }
    });

  } catch (error) {
    console.error('❌ 상태 조회 오류:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 모든 신청 목록 (공개용 - 간단한 정보만)
app.get('/api/account-requests', async (req, res) => {
  try {
    const { status = 'pending', limit = 10 } = req.query;
    
    let filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const requests = await AccountRequest.find(filter)
      .sort({ requestDate: -1 })
      .limit(parseInt(limit))
      .select('_id status requestDate storeCode createdAt');

    const totalCount = await AccountRequest.countDocuments(filter);

    res.json({
      success: true,
      data: requests,
      total: totalCount,
      showing: requests.length,
      filter: { status }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// ===== 관리자 API =====

// 관리자 - 모든 신청 목록 조회 (상세 정보 포함)
app.get('/api/admin/requests', async (req, res) => {
  try {
    console.log('📋 관리자 - MongoDB에서 신청 목록 조회');
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // populate 제거 - AccountRequest는 모든 정보를 자체적으로 가지고 있음
    const requests = await AccountRequest.find(filter)
      .sort({ requestDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await AccountRequest.countDocuments(filter);

    console.log(`📊 조회 결과: ${requests.length}/${totalCount}개 신청`);

    res.json({
      success: true,
      data: requests,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / parseInt(limit)),
        count: requests.length,
        totalItems: totalCount
      },
      filter: { status }
    });

  } catch (error) {
    console.error('❌ 신청 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 관리자 - 계정 승인
app.post('/api/admin/approve/:requestId', async (req, res) => {
  try {
    let { requestId } = req.params;
    const { notes } = req.body || {};

    // 파라미터 정리 (대괄호 및 공백 제거)
    requestId = requestId.replace(/[\[\]]/g, '').trim();
    
    console.log(`✅ 관리자 - 계정 승인 요청: ID ${requestId}`);
    console.log(`🔍 정리된 requestId: "${requestId}" (길이: ${requestId.length})`);

    // ObjectId 유효성 검사
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ 잘못된 ObjectId 형식:', requestId);
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.',
        receivedId: requestId,
        expectedFormat: '24자리 16진수 문자열'
      });
    }

    const request = await AccountRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '신청 정보를 찾을 수 없습니다.',
        requestId: requestId
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 신청입니다.',
        currentStatus: request.status
      });
    }

    // 계정 정보 생성
    const userId = generateUserId(request.storeCode);
    const tempPassword = generateTempPassword();

    // 신청 승인 (모델 메서드 사용)
    request.generatedUserId = userId;
    request.generatedPassword = tempPassword;
    await request.approve('admin', notes);

    // 사용자 계정 생성
    const newUser = new User({
      userId: userId,
      password: tempPassword,
      managerName: request.managerName,
      storeCode: request.storeCode,
      phoneLast4: request.phoneLast4,
      requestId: request._id
    });

    const savedUser = await newUser.save();

    console.log('✅ MongoDB에 계정 승인 완료:', {
      requestId: request._id,
      userId: userId
    });

    res.json({
      success: true,
      message: '계정이 승인되어 생성되었습니다.',
      data: {
        requestId: request._id,
        userId: userId,
        tempPassword: tempPassword,
        managerName: request.managerName,
        storeCode: request.storeCode,
        createdDate: savedUser.createdAt
      }
    });

  } catch (error) {
    console.error('❌ 승인 처리 오류:', error);
    
    // ObjectId 캐스팅 오류 특별 처리
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.',
        error: 'ObjectId 형식이 올바르지 않습니다.',
        receivedValue: error.value,
        expectedFormat: '24자리 16진수 문자열 (예: 507f1f77bcf86cd799439011)'
      });
    }

    // 중복 userId 오류 처리
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID 생성 중 중복이 발생했습니다. 다시 시도해주세요.'
      });
    }

    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});


// 관리자 - 계정 거부 (수정됨)
app.post('/api/admin/reject/:requestId', async (req, res) => {
  try {
    let { requestId } = req.params;
    const { notes } = req.body || {};

    // 파라미터 정리 (대괄호 및 공백 제거)
    requestId = requestId.replace(/[\[\]]/g, '').trim();

    console.log(`❌ 관리자 - 계정 거부 요청: ID ${requestId}`);

    // ObjectId 유효성 검사
    if (!requestId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.',
        receivedId: requestId
      });
    }

    const request = await AccountRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '신청 정보를 찾을 수 없습니다.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 신청입니다.',
        currentStatus: request.status
      });
    }

    // 신청 거부 (모델 메서드 사용)
    await request.reject('admin', notes);

    console.log('❌ MongoDB에서 계정 거부 완료:', requestId);

    res.json({
      success: true,
      message: '신청이 거부되었습니다.',
      data: {
        requestId: request._id,
        rejectedDate: request.processedDate,
        notes: request.notes
      }
    });

  } catch (error) {
    console.error('❌ 거부 처리 오류:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID 형식입니다.',
        error: 'ObjectId 형식이 올바르지 않습니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 관리자 - 사용자 목록
app.get('/api/admin/users', async (req, res) => {
  try {
    const { active = 'all', page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (active === 'true') {
      filter.isActive = true;
    } else if (active === 'false') {
      filter.isActive = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // User에서 requestId를 populate (User → AccountRequest)
    const users = await User.find(filter)
      .populate('requestId', 'managerName storeCode requestDate status notes processedDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password'); // 비밀번호 제외

    const totalCount = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / parseInt(limit)),
        count: users.length,
        totalItems: totalCount
      },
      filter: { active }
    });

  } catch (error) {
    console.error('❌ 사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 관리자 - 특정 신청의 상세 정보 (사용자 정보 포함)
app.get('/api/admin/requests/:requestId/details', async (req, res) => {
  try {
    const request = await AccountRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '신청 정보를 찾을 수 없습니다.'
      });
    }

    // 해당 신청으로 생성된 사용자 찾기
    let user = null;
    if (request.status === 'approved') {
      user = await User.findOne({ requestId: request._id })
        .select('-password');
    }

    res.json({
      success: true,
      data: {
        request: request,
        user: user,
        hasUser: !!user
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 관리자 - 통계
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [requestStats, userStats] = await Promise.all([
      AccountRequest.getStats(),
      User.getStats()
    ]);

    // 최근 활동 통계
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentStats = {
      todayRequests: await AccountRequest.countDocuments({
        createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) }
      }),
      weekRequests: await AccountRequest.countDocuments({
        createdAt: { $gte: weekAgo }
      }),
      weekApprovals: await AccountRequest.countDocuments({
        status: 'approved',
        processedDate: { $gte: weekAgo }
      })
    };

    res.json({
      success: true,
      data: {
        requests: requestStats,
        users: userStats,
        recent: recentStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// ===== 테스트 및 개발용 API =====

// 테스트용 라우트
app.post('/api/test', (req, res) => {
  console.log('🧪 테스트 라우트 호출');
  console.log('📦 Body:', req.body);
  console.log('📋 Headers:', req.headers);
  
  res.json({
    success: true,
    message: 'Test endpoint working!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// 데이터 초기화 (개발용)
app.post('/api/dev/reset', async (req, res) => {
  try {
    await AccountRequest.deleteMany({});
    await User.deleteMany({});
    
    console.log('🔄 MongoDB 데이터 초기화 완료');
    
    res.json({
      success: true,
      message: 'MongoDB의 모든 데이터가 초기화되었습니다.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '초기화 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 샘플 데이터 생성 (개발용)
app.post('/api/dev/sample', async (req, res) => {
  try {
    const sampleRequests = [
      {
        managerName: '김매니저',
        storeCode: 'ST001',
        phoneLast4: '1234'
      },
      {
        managerName: '이담당',
        storeCode: 'ST002',
        phoneLast4: '5678'
      },
      {
        managerName: '박팀장',
        storeCode: 'ST003',
        phoneLast4: '9999'
      }
    ];

    const savedRequests = await AccountRequest.insertMany(sampleRequests);

    console.log('📝 샘플 데이터 생성 완료:', savedRequests.length, '개');

    res.json({
      success: true,
      message: 'MongoDB에 샘플 데이터가 생성되었습니다.',
      data: savedRequests.map(req => ({
        id: req._id,
        managerName: req.managerName,
        storeCode: req.storeCode,
        status: req.status
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '샘플 데이터 생성 실패',
      error: error.message
    });
  }
});

// ===== 에러 핸들링 =====

// 404 핸들링
app.use('*', (req, res) => {
  console.log(`❌ 404 - 경로를 찾을 수 없음: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    message: '요청한 경로를 찾을 수 없습니다.',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      public: [
        'GET /',
        'GET /health',
        'POST /api/account-requests',
        'GET /api/account-requests/status/:id'
      ],
      admin: [
        'GET /api/admin/requests',
        'POST /api/admin/approve/:id',
        'POST /api/admin/reject/:id',
        'GET /api/admin/stats',
        'GET /api/admin/users'
      ],
      dev: [
        'POST /api/test',
        'POST /api/dev/reset',
        'POST /api/dev/sample'
      ]
    }
  });
});

// 전역 에러 핸들링
app.use((err, req, res, next) => {
  console.error('💥 서버 에러:', err);
  
  // Mongoose 에러 처리
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: '입력 데이터 검증 실패',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Cast Error',
      message: '잘못된 ID 형식입니다.'
    });
  }

  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    message: '서버 내부 오류가 발생했습니다.'
  });
});

// ===== 서버 시작 =====
const PORT = process.env.PORT || 5480;
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 퀴노스 서버가 시작되었습니다! (Models 분리 + 오류 수정 버전)`);
  console.log(`📍 주소: http://localhost:${PORT}`);
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`💾 데이터베이스: quinors-lv`);
  console.log(`📋 모델: AccountRequest, User`);
  console.log(`📁 구조: server.js + models/ 폴더`);
  console.log(`\n📋 사용 가능한 API 엔드포인트:`);
  console.log(`   GET    /                           - 서버 정보 및 통계`);
  console.log(`   GET    /health                     - 헬스체크`);
  console.log(`   GET    /api/status                 - 서버 상태`);
  console.log(`   POST   /api/account-requests       - 계정 발급 신청`);
  console.log(`   GET    /api/account-requests       - 신청 목록 (공개)`);
  console.log(`   GET    /api/account-requests/status/:id - 신청 상태 확인`);
  console.log(`   GET    /api/admin/requests         - 관리자: 신청 목록`);
  console.log(`   POST   /api/admin/approve/:id      - 관리자: 계정 승인`);
  console.log(`   POST   /api/admin/reject/:id       - 관리자: 계정 거부`);
  console.log(`   GET    /api/admin/users            - 관리자: 사용자 목록`);
  console.log(`   GET    /api/admin/stats            - 관리자: 통계`);
  console.log(`   GET    /api/admin/requests/:id/details - 관리자: 상세 정보`);
  console.log(`   POST   /api/test                   - 테스트`);
  console.log(`   POST   /api/dev/reset              - 개발: 데이터 초기화`);
  console.log(`   POST   /api/dev/sample             - 개발: 샘플 데이터 생성`);
  console.log('='.repeat(80) + '\n');
});

// 프로세스 종료 처리
process.on('SIGTERM', () => {
  console.log('\n🛑 서버 종료 신호 수신...');
  server.close(() => {
    console.log('✅ 서버가 안전하게 종료되었습니다.');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 신호 수신 (Ctrl+C)...');
  server.close(() => {
    console.log('✅ 서버가 안전하게 종료되었습니다.');
    mongoose.connection.close();
    process.exit(0);
  });
});

// 예상치 못한 에러 처리
process.on('uncaughtException', (err) => {
  console.error('💥 예상치 못한 에러:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

module.exports = app;