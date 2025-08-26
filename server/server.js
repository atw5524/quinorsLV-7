const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// 모델 import
const Store = require('./models/Store');
const AccountRequest = require('./models/AccountRequest');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5480;
const JWT_SECRET = process.env.JWT_SECRET || 'q1u2i1n@o!r%%s123912jdn1d219c1nc1n2j12';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv';

// 보안 미들웨어
app.use(helmet());
app.use(compression());

// CORS 설정
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003','https://www.quinors-lv.ngrok.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));

// OPTIONS 요청 처리 추가
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // 최대 1000 요청
  message: {
    success: false,
    message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10 요청
  message: {
    success: false,
    message: '계정 발급 요청이 너무 많습니다. 15분 후 다시 시도해주세요.'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10 로그인 시도
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
  }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB 연결
mongoose.connect(MONGODB_URI, {
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

// MongoDB 연결 상태 모니터링
mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB 연결 오류:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB 연결이 끊어졌습니다');
});

// 유틸리티 함수들
const generateUserId = (storeCode, department = '') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const deptCode = department ? `_${department.substring(0, 2).toUpperCase()}` : '';
  return `${storeCode}${deptCode}_${timestamp}${random}`;
};

const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
               (req.connection.socket ? req.connection.socket.remoteAddress : null),
    userAgent: req.get('User-Agent') || 'Unknown'
  };
};

// 🎯 새로운 유틸리티 함수: User 계정 존재 여부 확인
const checkUserAccountsForDepartments = async (departments, storeCode) => {
  if (!departments || !Array.isArray(departments)) return departments;
  
  const updatedDepartments = [];
  
  for (const dept of departments) {
    // 해당 부서의 User 계정 존재 여부 확인
    const userExists = await User.findOne({
      storeCode: storeCode,
      department: dept.department,
      managerName: dept.managerName,
      phoneLast4: dept.phoneLast4,
      isActive: true
    });
    
    updatedDepartments.push({
      ...dept.toObject ? dept.toObject() : dept,
      hasUserAccount: !!userExists,
      userAccountId: userExists ? userExists.userId : null,
      // 실제 계정 존재 여부로 accountIssued 업데이트
      accountIssued: !!userExists
    });
  }
  
  return updatedDepartments;
};

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
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 사용자 존재 및 활성 상태 확인 (새로운 User 스키마 사용)
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

// API 라우트들

// 서버 상태 확인
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 사용자 로그인 API - 개선된 버전 (새로운 User 스키마 사용)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { userId, password } = req.body;

    // 입력 검증
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID와 비밀번호를 입력해주세요.'
      });
    }

    console.log('🔐 로그인 시도:', { userId });

    // 사용자 찾기 (정적 메서드 사용)
    const user = await User.findByUserId(userId);

    if (!user) {
      console.log('❌ 사용자 없음:', userId);
      return res.status(401).json({
        success: false,
        message: '존재하지 않는 사용자입니다.'
      });
    }

    // 계정 활성 상태 확인
    if (!user.isActive) {
      console.log('❌ 비활성 계정:', userId);
      return res.status(401).json({
        success: false,
        message: '비활성화된 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 계정 잠금 상태 확인 (가상 필드 사용)
    if (user.isLocked) {
      console.log('❌ 잠긴 계정:', userId);
      return res.status(423).json({
        success: false,
        message: '계정이 잠겨있습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.',
        lockedUntil: user.lockUntil
      });
    }

    // 비밀번호 확인 (인스턴스 메서드 사용)
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      console.log('❌ 비밀번호 오류:', userId);
      
      // 로그인 시도 횟수 증가
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: '잘못된 비밀번호입니다.',
        remainingAttempts: Math.max(0, 5 - (user.loginAttempts + 1))
      });
    }

    // JWT 토큰 생성 (추가 정보 포함)
    const tokenPayload = {
      userId: user.userId,
      storeCode: user.storeCode,
      managerName: user.managerName,
      role: user.role,
      permissions: user.permissions
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 로그인 성공 처리 (인스턴스 메서드 사용)
    await user.updateLastLogin();

    console.log('✅ 로그인 성공:', { 
      userId, 
      managerName: user.managerName, 
      role: user.role,
      fullInfo: user.fullInfo 
    });

    // 응답 (toJSON transform으로 민감한 정보 자동 제외)
    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token,
        user: {
          userId: user.userId,
          managerName: user.managerName,
          storeCode: user.storeCode,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin,
          fullInfo: user.fullInfo
        }
      }
    });

  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 비밀번호 변경 API - 개선된 버전
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { userId } = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 6자리 이상이어야 합니다.'
      });
    }

    const user = await User.findByUserId(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await user.comparePassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 새 비밀번호로 변경 (인스턴스 메서드 사용)
    await user.resetPassword(newPassword);

    console.log('🔑 비밀번호 변경 성공:', { userId, managerName: user.managerName });

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 사용자 정보 조회 API - 개선된 버전
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findByUserId(userId)
      .populate('requestId');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: user // toJSON transform이 자동으로 민감한 정보 제외
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 통계 조회 API (관리자용)
app.get('/api/admin/user-stats', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const stats = await User.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('사용자 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 계정 발급 신청 API (자동 처리) - 부서별 지원
app.post('/api/account-requests', strictLimiter, async (req, res) => {
  try {
    console.log('\n🔍 === 자동 계정 발급 신청 처리 시작 ===');
    const { managerName, storeCode, phoneLast4, department } = req.body || {};
    const clientInfo = getClientInfo(req);

    console.log('📝 신청 데이터:', { managerName, storeCode, phoneLast4, department });

    // 입력 검증
    if (!managerName || !storeCode || !phoneLast4) {
      return res.status(400).json({
        success: false,
        message: '모든 필수 정보를 입력해주세요.'
      });
    }

    if (phoneLast4.length !== 4 || !/^\d{4}$/.test(phoneLast4)) {
      return res.status(400).json({
        success: false,
        message: '연락처 뒷 4자리는 숫자 4자리여야 합니다.'
      });
    }

    // 부서 검증 (선택사항)
    if (department && !['여성', '남성', '슈즈'].includes(department)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 부서입니다.'
      });
    }

    // 1. 중복 신청 확인 (부서별 고려)
    const duplicateQuery = {
      storeCode: storeCode.toUpperCase(),
      phoneLast4: phoneLast4,
      status: { $in: ['pending', 'auto_approved', 'manual_approved'] }
    };
    
    if (department) {
      duplicateQuery.department = department;
    }

    const existingRequest = await AccountRequest.findOne(duplicateQuery);
    if (existingRequest) {
      console.log('❌ 중복 신청 발견:', existingRequest._id);
      return res.status(400).json({
        success: false,
        message: '이미 신청된 정보입니다.',
        existingRequest: {
          id: existingRequest._id,
          status: existingRequest.status,
          department: existingRequest.department,
          requestDate: existingRequest.requestDate
        }
      });
    }

    // 2. 매장 정보 검증 (부서별 고려)
    console.log('🔍 매장 정보 검증 중...');
    const matchedStore = await Store.validateStoreInfo(storeCode, managerName, phoneLast4, department);

    // 3. 신청 생성
    const newRequest = new AccountRequest({
      managerName,
      storeCode: storeCode.toUpperCase(),
      phoneLast4,
      department: department || null,
      ...clientInfo
    });

    if (matchedStore) {
      // 자동 승인 처리
      console.log('✅ 매장 정보 일치! 자동 승인 처리');
      
      // 계정 정보 생성
      const userId = generateUserId(storeCode, department);
      const tempPassword = generateTempPassword();

      // 신청 자동 승인
      await newRequest.autoApprove(matchedStore, userId, tempPassword);

      // 사용자 계정 생성 (개선된 스키마 사용)
      const newUser = new User({
        userId: userId,
        password: tempPassword, // pre-save hook에서 자동 해시화
        managerName: managerName,
        storeCode: storeCode.toUpperCase(),
        phoneLast4: phoneLast4,
        department: department || null,
        role: 'user',
        permissions: ['read', 'write'],
        requestId: newRequest._id
      });

      await newUser.save();

      // 매장 정보 업데이트 (부서별 고려)
      if (matchedStore.matchedDepartment) {
        // 새로운 부서별 구조
        const store = await Store.findById(matchedStore._id);
        const deptIndex = store.departments.findIndex(d => d._id.toString() === matchedStore.matchedDepartment._id.toString());
        
        if (deptIndex !== -1) {
          store.departments[deptIndex].accountIssued = true;
          store.departments[deptIndex].accountIssuedDate = new Date();
          store.departments[deptIndex].generatedUserId = userId;
          await store.save();
        }
      } else {
        // 기존 구조
        await Store.findByIdAndUpdate(matchedStore._id, {
          accountIssued: true,
          accountIssuedDate: new Date(),
          generatedUserId: userId
        });
      }

      console.log('🎉 자동 계정 발급 완료:', { userId, storeCode, department });

      res.status(201).json({
        success: true,
        message: '계정이 자동으로 발급되었습니다!',
        data: {
          requestId: newRequest._id,
          status: 'auto_approved',
          userId: userId,
          tempPassword: tempPassword,
          storeName: matchedStore.storeName,
          department: department,
          processType: 'auto',
          requestDate: newRequest.requestDate
        }
      });

    } else {
      // 매장 정보 불일치 - 자동 거부
      console.log('❌ 매장 정보 불일치 - 자동 거부');
      
      await newRequest.reject('등록된 매장 정보와 일치하지 않습니다. 매장코드, 담당자명, 연락처, 부서를 확인해주세요.');

      res.status(400).json({
        success: false,
        message: '입력하신 정보가 등록된 매장 정보와 일치하지 않습니다.',
        data: {
          requestId: newRequest._id,
          status: 'rejected',
          reason: '매장 정보 불일치',
          department: department,
          requestDate: newRequest.requestDate
        }
      });
    }

  } catch (error) {
    console.error('❌ 계정 신청 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 매장 관리 API들

// 매장 등록 - 부서별 담당자 지원 + phoneLast4 자동 생성 + User 자동 생성 옵션
app.post('/api/admin/stores', async (req, res) => {
  try {
    console.log('📥 매장 등록 요청 받음');
    console.log('📝 요청 바디:', req.body);
    
    const { storeCode, storeName, address, notes, departments, autoCreateUsers } = req.body;
    
    // 입력 검증
    if (!storeCode || !storeName) {
      console.log('❌ 필수 정보 누락');
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요. (매장코드, 매장명)',
        received: { storeCode, storeName }
      });
    }

    // 부서별 담당자 정보 검증
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: '최소 하나의 부서별 담당자 정보가 필요합니다.'
      });
    }

    // 각 부서 정보 검증 및 phoneLast4 자동 생성
    for (const dept of departments) {
      if (!dept.department || !dept.managerName || !dept.fullPhone) {
        return res.status(400).json({
          success: false,
          message: '모든 부서의 담당자명과 연락처를 입력해주세요.'
        });
      }

      // 전화번호 형식 검증
      const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
      if (!phoneRegex.test(dept.fullPhone)) {
        return res.status(400).json({
          success: false,
          message: `${dept.department}부 연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)`,
          received: dept.fullPhone
        });
      }

      // 부서 유효성 검증
      if (!['여성', '남성', '슈즈'].includes(dept.department)) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 부서입니다. (여성, 남성, 슈즈만 가능)'
        });
      }

      // phoneLast4 자동 생성 (클라이언트에서 안 보냈을 경우 대비)
      if (!dept.phoneLast4) {
        const phoneNumbers = dept.fullPhone.replace(/[^0-9]/g, '');
        dept.phoneLast4 = phoneNumbers.slice(-4);
        console.log('📱 서버에서 phoneLast4 자동 생성:', { 
          department: dept.department, 
          fullPhone: dept.fullPhone, 
          phoneLast4: dept.phoneLast4 
        });
      }
    }

    // 중복 부서 확인
    const deptNames = departments.map(d => d.department);
    const uniqueDepts = [...new Set(deptNames)];
    if (deptNames.length !== uniqueDepts.length) {
      return res.status(400).json({
        success: false,
        message: '중복된 부서가 있습니다.'
      });
    }

    // Store 객체 생성
    const storeData = {
      storeCode: storeCode.toUpperCase(),
      storeName,
      address,
      notes,
      departments: departments.map(dept => ({
        department: dept.department,
        managerName: dept.managerName,
        fullPhone: dept.fullPhone,
        phoneLast4: dept.phoneLast4, // 이미 생성됨
        accountIssued: false
      })),
      createdBy: 'admin'
    };

    console.log('💾 저장할 데이터:', storeData);

    const newStore = new Store(storeData);
    
    console.log('💾 매장 저장 시도 중...');
    const savedStore = await newStore.save();
    console.log('✅ 매장 저장 완료:', savedStore._id);

    // 🎯 User 계정 자동 생성 옵션 처리
    let createdUsers = [];
    if (autoCreateUsers) {
      console.log('👤 User 계정 자동 생성 시작...');
      
      for (const dept of departments) {
        try {
          const userId = generateUserId(storeCode, dept.department);
          const tempPassword = generateTempPassword();
          
          // User 계정 생성
          const newUser = new User({
            userId: userId,
            password: tempPassword,
            managerName: dept.managerName,
            storeCode: storeCode.toUpperCase(),
            phoneLast4: dept.phoneLast4,
            department: dept.department,
            role: 'user',
            permissions: ['read', 'write']
          });
          
          await newUser.save();
          
          // 매장의 해당 부서 정보 업데이트
          const deptIndex = savedStore.departments.findIndex(d => d.department === dept.department);
          if (deptIndex !== -1) {
            savedStore.departments[deptIndex].accountIssued = true;
            savedStore.departments[deptIndex].accountIssuedDate = new Date();
            savedStore.departments[deptIndex].generatedUserId = userId;
          }
          
          createdUsers.push({
            department: dept.department,
            managerName: dept.managerName,
            userId: userId,
            tempPassword: tempPassword
          });
          
          console.log('✅ User 계정 생성 완료:', { userId, department: dept.department });
        } catch (userError) {
          console.error('❌ User 계정 생성 실패:', userError);
        }
      }
      
      // 매장 정보 업데이트 (계정 발급 상태 반영)
      await savedStore.save();
    }
    
    res.status(201).json({
      success: true,
      message: '매장이 등록되었습니다.',
      data: {
        ...savedStore.toObject(),
        createdUsers: createdUsers
      }
    });

  } catch (error) {
    console.error('❌ 매장 등록 오류 상세:', error);
    
    if (error.code === 11000) {
      console.log('❌ 중복 매장코드:', error.keyValue);
      return res.status(400).json({
        success: false,
        message: '이미 등록된 매장코드입니다.',
        duplicateKey: error.keyValue
      });
    }
    
    if (error.name === 'ValidationError') {
      console.log('❌ 검증 오류:', error.message);
      console.log('❌ 검증 오류 상세:', error.errors);
      return res.status(400).json({
        success: false,
        message: '입력 데이터 검증 실패',
        details: error.message,
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: '매장 등록 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
    });
  }
});

// 🎯 수정된 매장 목록 조회 - 실제 User 계정 존재 여부 확인
app.get('/api/admin/stores', async (req, res) => {
  try {
    console.log('🏪 매장 목록 API 호출 시작...');
    const { active = 'all', page = 1, limit = 50, search } = req.query;
    
    let filter = {};
    if (active === 'true') filter.isActive = true;
    else if (active === 'false') filter.isActive = false;
    
    if (search) {
      filter.$or = [
        { storeCode: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { 'departments.managerName': { $regex: search, $options: 'i' } },
        { 'departments.department': { $regex: search, $options: 'i' } },
        // 기존 필드 호환성
        { managerName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const stores = await Store.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // 🎯 각 매장의 부서별 실제 User 계정 존재 여부 확인
    const storesWithUserStatus = [];
    
    for (const store of stores) {
      const storeObj = store.toObject();
      
      if (storeObj.departments && storeObj.departments.length > 0) {
        // 부서별 User 계정 존재 여부 확인
        storeObj.departments = await checkUserAccountsForDepartments(
          storeObj.departments, 
          storeObj.storeCode
        );
      } else if (storeObj.managerName && storeObj.phoneLast4) {
        // 기존 구조 호환성 - User 계정 존재 여부 확인
        const userExists = await User.findOne({
          storeCode: storeObj.storeCode,
          managerName: storeObj.managerName,
          phoneLast4: storeObj.phoneLast4,
          isActive: true
        });
        
        storeObj.hasUserAccount = !!userExists;
        storeObj.accountIssued = !!userExists; // 실제 계정 존재 여부로 업데이트
      }
      
      storesWithUserStatus.push(storeObj);
    }
      
    const totalCount = await Store.countDocuments(filter);
    console.log('🏪 ✅ 매장 목록 조회 성공:', storesWithUserStatus.length);

    res.json({
      success: true,
      data: storesWithUserStatus,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / parseInt(limit)),
        count: storesWithUserStatus.length,
        totalItems: totalCount
      },
      filter: { active, search }
    });

  } catch (error) {
    console.error('❌ 매장 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '매장 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 🎯 개선된 매장 수정 - User 계정과 동기화
app.put('/api/admin/stores/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const updateData = req.body;
    
    console.log('✏️ 매장 수정 요청:', { storeId, updateData });

    // 기존 매장 정보 조회
    const existingStore = await Store.findById(storeId);
    if (!existingStore) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    // storeCode 대문자 변환
    if (updateData.storeCode) {
      updateData.storeCode = updateData.storeCode.toUpperCase();
    }

    // 부서별 담당자 정보 검증 및 phoneLast4 자동 생성 (있는 경우)
    if (updateData.departments && Array.isArray(updateData.departments)) {
      for (const dept of updateData.departments) {
        if (!dept.department || !dept.managerName || !dept.fullPhone) {
          return res.status(400).json({
            success: false,
            message: '모든 부서의 담당자명과 연락처를 입력해주세요.'
          });
        }

        // 전화번호 형식 검증
        const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
        if (!phoneRegex.test(dept.fullPhone)) {
          return res.status(400).json({
            success: false,
            message: `${dept.department}부 연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)`
          });
        }

        // 부서 유효성 검증
        if (!['여성', '남성', '슈즈'].includes(dept.department)) {
          return res.status(400).json({
            success: false,
            message: '유효하지 않은 부서입니다. (여성, 남성, 슈즈만 가능)'
          });
        }

        // phoneLast4 자동 생성 (클라이언트에서 안 보냈을 경우 대비)
        if (!dept.phoneLast4) {
          const phoneNumbers = dept.fullPhone.replace(/[^0-9]/g, '');
          dept.phoneLast4 = phoneNumbers.slice(-4);
          console.log('📱 서버에서 phoneLast4 자동 생성:', { 
            department: dept.department, 
            fullPhone: dept.fullPhone, 
            phoneLast4: dept.phoneLast4 
          });
        }
      }

      // 중복 부서 확인
      const deptNames = updateData.departments.map(d => d.department);
      const uniqueDepts = [...new Set(deptNames)];
      if (deptNames.length !== uniqueDepts.length) {
        return res.status(400).json({
          success: false,
          message: '중복된 부서가 있습니다.'
        });
      }

      // 🎯 부서 변경사항 분석 및 User 계정 동기화
      const existingDepts = existingStore.departments || [];
      const newDepts = updateData.departments;

      // 삭제된 부서 찾기
      const deletedDepts = existingDepts.filter(existingDept => 
        !newDepts.some(newDept => 
          newDept.department === existingDept.department &&
          newDept.managerName === existingDept.managerName &&
          newDept.phoneLast4 === existingDept.phoneLast4
        )
      );

      // 추가된 부서 찾기
      const addedDepts = newDepts.filter(newDept => 
        !existingDepts.some(existingDept => 
          existingDept.department === newDept.department &&
          existingDept.managerName === newDept.managerName &&
          existingDept.phoneLast4 === newDept.phoneLast4
        )
      );

      console.log('📊 부서 변경사항:', {
        deleted: deletedDepts.length,
        added: addedDepts.length
      });

      // 삭제된 부서의 User 계정 비활성화
      for (const deletedDept of deletedDepts) {
        try {
          const userToDeactivate = await User.findOne({
            storeCode: existingStore.storeCode,
            department: deletedDept.department,
            managerName: deletedDept.managerName,
            phoneLast4: deletedDept.phoneLast4
          });

          if (userToDeactivate) {
            userToDeactivate.isActive = false;
            userToDeactivate.deactivatedAt = new Date();
            userToDeactivate.deactivationReason = '매장 정보 수정으로 인한 담당자 제거';
            await userToDeactivate.save();
            
            console.log('🔒 User 계정 비활성화:', {
              userId: userToDeactivate.userId,
              department: deletedDept.department
            });
          }
        } catch (userError) {
          console.error('❌ User 계정 비활성화 실패:', userError);
        }
      }

      // 새로 추가된 부서의 실제 User 계정 존재 여부 확인
      for (const addedDept of addedDepts) {
        const existingUser = await User.findOne({
          storeCode: existingStore.storeCode,
          department: addedDept.department,
          managerName: addedDept.managerName,
          phoneLast4: addedDept.phoneLast4,
          isActive: true
        });

        // 실제 계정 존재 여부로 accountIssued 설정
        addedDept.accountIssued = !!existingUser;
        if (existingUser) {
          addedDept.generatedUserId = existingUser.userId;
          addedDept.accountIssuedDate = existingUser.createdAt;
        }
      }

      // 기존 부서들도 실제 User 계정 존재 여부 확인
      for (const dept of updateData.departments) {
        if (!addedDepts.includes(dept)) {
          // 기존 부서인 경우 실제 User 계정 확인
          const existingUser = await User.findOne({
            storeCode: existingStore.storeCode,
            department: dept.department,
            managerName: dept.managerName,
            phoneLast4: dept.phoneLast4,
            isActive: true
          });

          dept.accountIssued = !!existingUser;
          if (existingUser) {
            dept.generatedUserId = existingUser.userId;
            dept.accountIssuedDate = existingUser.createdAt;
          }
        }
      }
    }

    // 기존 fullPhone 필드 처리 (호환성)
    if (updateData.fullPhone) {
      const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
      if (!phoneRegex.test(updateData.fullPhone)) {
        return res.status(400).json({
          success: false,
          message: '올바른 휴대폰 번호 형식으로 입력해주세요. (예: 010-1234-5678)'
        });
      }
      
      // phoneLast4 자동 추출
      const phoneNumbers = updateData.fullPhone.replace(/[^0-9]/g, '');
      updateData.phoneLast4 = phoneNumbers.slice(-4);
    }
    
    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }
    
    console.log('✅ 매장 수정 완료:', {
      storeCode: updatedStore.storeCode,
      departments: updatedStore.departments?.length || 0
    });
    
    res.json({
      success: true,
      message: '매장 정보가 수정되었습니다.',
      data: updatedStore
    });

  } catch (error) {
    console.error('매장 수정 오류:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 매장코드입니다.'
      });
    }
    res.status(500).json({
      success: false,
      message: '매장 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 매장 삭제 (비활성화)
app.delete('/api/admin/stores/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '매장이 비활성화되었습니다.',
      data: updatedStore
    });

  } catch (error) {
    console.error('매장 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '매장 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 🎯 새로운 API: 개별 부서 계정 생성
app.post('/api/admin/stores/:storeId/departments/:departmentId/create-account', async (req, res) => {
  try {
    const { storeId, departmentId } = req.params;
    
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    const department = store.departments.id(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.'
      });
    }

    // 이미 계정이 있는지 확인
    const existingUser = await User.findOne({
      storeCode: store.storeCode,
      department: department.department,
      managerName: department.managerName,
      phoneLast4: department.phoneLast4,
      isActive: true
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '이미 계정이 존재합니다.',
        existingUserId: existingUser.userId
      });
    }

    // 새 User 계정 생성
    const userId = generateUserId(store.storeCode, department.department);
    const tempPassword = generateTempPassword();
    
    const newUser = new User({
      userId: userId,
      password: tempPassword,
      managerName: department.managerName,
      storeCode: store.storeCode,
      phoneLast4: department.phoneLast4,
      department: department.department,
      role: 'user',
      permissions: ['read', 'write']
    });

    await newUser.save();

    // 매장 부서 정보 업데이트
    department.accountIssued = true;
    department.accountIssuedDate = new Date();
    department.generatedUserId = userId;
    await store.save();

    console.log('✅ 개별 계정 생성 완료:', { userId, storeCode: store.storeCode, department: department.department });

    res.json({
      success: true,
      message: '계정이 성공적으로 생성되었습니다.',
      data: {
        userId: userId,
        tempPassword: tempPassword,
        department: department.department,
        managerName: department.managerName
      }
    });

  } catch (error) {
    console.error('개별 계정 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '계정 생성 중 오류가 발생했습니다.'
    });
  }
});

// 🎯 새로운 API: 개별 부서 계정 삭제
app.delete('/api/admin/stores/:storeId/departments/:departmentId/delete-account', async (req, res) => {
  try {
    const { storeId, departmentId } = req.params;
    
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    const department = store.departments.id(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '부서를 찾을 수 없습니다.'
      });
    }

    // User 계정 찾기 및 비활성화
    const userToDelete = await User.findOne({
      storeCode: store.storeCode,
      department: department.department,
      managerName: department.managerName,
      phoneLast4: department.phoneLast4
    });

    if (userToDelete) {
      userToDelete.isActive = false;
      userToDelete.deactivatedAt = new Date();
      userToDelete.deactivationReason = '관리자에 의한 계정 삭제';
      await userToDelete.save();
    }

    // 매장 부서 정보 업데이트
    department.accountIssued = false;
    department.accountIssuedDate = null;
    department.generatedUserId = null;
    await store.save();

    console.log('✅ 개별 계정 삭제 완료:', { 
      userId: userToDelete?.userId, 
      storeCode: store.storeCode, 
      department: department.department 
    });

    res.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.',
      data: {
        deletedUserId: userToDelete?.userId,
        department: department.department,
        managerName: department.managerName
      }
    });

  } catch (error) {
    console.error('개별 계정 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '계정 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 🎯 새로운 API: 매장 계정 상태 검증
app.get('/api/admin/stores/:storeId/verify-accounts', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    // 각 부서별 실제 User 계정 존재 여부 확인
    const verifiedDepartments = [];
    let needsUpdate = false;

    for (const dept of store.departments || []) {
      const userExists = await User.findOne({
        storeCode: store.storeCode,
        department: dept.department,
        managerName: dept.managerName,
        phoneLast4: dept.phoneLast4,
        isActive: true
      });

      const actualStatus = !!userExists;
      const storedStatus = dept.accountIssued;

      verifiedDepartments.push({
        _id: dept._id,
        department: dept.department,
        managerName: dept.managerName,
        storedStatus: storedStatus,
        actualStatus: actualStatus,
        needsSync: storedStatus !== actualStatus,
        userId: userExists?.userId || null
      });

      // 상태가 다르면 업데이트 필요
      if (storedStatus !== actualStatus) {
        needsUpdate = true;
        dept.accountIssued = actualStatus;
        if (actualStatus && userExists) {
          dept.generatedUserId = userExists.userId;
          dept.accountIssuedDate = userExists.createdAt;
        } else {
          dept.generatedUserId = null;
          dept.accountIssuedDate = null;
        }
      }
    }

    // 필요시 매장 정보 업데이트
    if (needsUpdate) {
      await store.save();
      console.log('🔄 매장 계정 상태 동기화 완료:', store.storeCode);
    }

    res.json({
      success: true,
      data: {
        storeCode: store.storeCode,
        storeName: store.storeName,
        departments: verifiedDepartments,
        needsUpdate: needsUpdate,
        totalDepartments: verifiedDepartments.length,
        issuedCount: verifiedDepartments.filter(d => d.actualStatus).length
      }
    });

  } catch (error) {
    console.error('계정 상태 검증 오류:', error);
    res.status(500).json({
      success: false,
      message: '계정 상태 검증 중 오류가 발생했습니다.'
    });
  }
});

// 신청 목록 조회 (관리자용)
app.get('/api/admin/requests', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const requests = await AccountRequest.find(filter)
      .populate('validationResult.matchedStore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const totalCount = await AccountRequest.countDocuments(filter);

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
    console.error('신청 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '신청 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 통계 조회 API
app.get('/api/admin/stats', async (req, res) => {
  try {
    const storeStats = await Store.getStats();
    const requestStats = await AccountRequest.getStats();
    const userStats = await User.getStats();

    res.json({
      success: true,
      data: {
        stores: {
          total: storeStats.total,
          active: storeStats.active,
          inactive: storeStats.inactive,
          issued: storeStats.accountIssued,
          notIssued: storeStats.accountNotIssued,
          departmentStats: storeStats.departmentStats || {}
        },
        requests: requestStats,
        users: userStats
      }
    });

  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 목록 조회 (관리자용)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const { active = 'all', role = 'all', page = 1, limit = 20, search } = req.query;
    
    let filter = {};
    if (active === 'true') filter.isActive = true;
    else if (active === 'false') filter.isActive = false;
    
    if (role !== 'all') filter.role = role;
    
    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { managerName: { $regex: search, $options: 'i' } },
        { storeCode: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter)
      .populate('requestId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
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
      filter: { active, role, search }
    });

  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 부서별 계정 발급 상태 조회 API
app.get('/api/admin/stores/:storeId/departments', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const store = await Store.findById(storeId);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    // 부서별 정보와 계정 발급 상태 반환
    const departmentInfo = store.departments?.map(dept => ({
      _id: dept._id,
      department: dept.department,
      managerName: dept.managerName,
      fullPhone: dept.fullPhone,
      phoneLast4: dept.phoneLast4,
      accountIssued: dept.accountIssued,
      accountIssuedDate: dept.accountIssuedDate,
      generatedUserId: dept.generatedUserId
    })) || [];

    res.json({
      success: true,
      data: {
        storeCode: store.storeCode,
        storeName: store.storeName,
        departments: departmentInfo,
        totalDepartments: departmentInfo.length,
        issuedCount: departmentInfo.filter(d => d.accountIssued).length
      }
    });

  } catch (error) {
    console.error('부서별 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '부서별 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 404 에러 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 전역 에러 핸들러
app.use((error, req, res, next) => {
  console.error('전역 에러:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📱 프론트엔드: http://localhost:3000`);
  console.log(`🔧 API 서버: http://localhost:${PORT}`);
  console.log(`💾 MongoDB: ${MONGODB_URI}`);
  console.log(`🌟 환경: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 서버 종료 중...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB 연결이 정상적으로 종료되었습니다.');
    process.exit(0);
  } catch (error) {
    console.error('❌ 서버 종료 중 오류:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
  console.error('위치:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
  process.exit(1);
});

module.exports = app;