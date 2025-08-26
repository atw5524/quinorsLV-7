const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const config = require('../config/config');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { getClientInfo } = require('../utils/helpers');

const User = require('../models/User');
const AccountRequest = require('../models/Register');
const Store = require('../models/Store');

// 사용자 로그인 API - 개선된 버전 (새로운 User 스키마 사용)
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
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
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
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
}));

// 비밀번호 변경 API - 개선된 버전
router.put('/change-password', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// 사용자 정보 조회 API - 개선된 버전
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// 회원가입 신청 API (수정된 버전 - 단순 신청만)
router.post('/register', asyncHandler(async (req, res) => {
  console.log('\n🔍 === 회원가입 신청 처리 시작 ===');
  
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

  // 중복 신청 확인 (부서별 고려)
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

  // 매장 정보 검증 (부서별 고려)
  console.log('🔍 매장 정보 검증 중...');
  const matchedStore = await Store.validateStoreInfo(storeCode, managerName, phoneLast4, department);

  // 신청 생성 (승인 대기 상태로)
  const newRequest = new Register({
    managerName,
    storeCode: storeCode.toUpperCase(),
    phoneLast4,
    department: department || null,
    status: 'pending', // 항상 대기 상태로 생성
    validationResult: {
      isValid: !!matchedStore,
      matchedStore: matchedStore ? matchedStore._id : null,
      validatedAt: new Date()
    },
    ...clientInfo
  });

  await newRequest.save();

  console.log('📝 회원가입 신청 접수 완료:', {
    requestId: newRequest._id,
    storeCode,
    department,
    isValid: !!matchedStore
  });

  res.status(201).json({
    success: true,
    message: '회원가입 신청이 접수되었습니다. 관리자 승인을 기다려주세요.',
    data: {
      requestId: newRequest._id,
      status: 'pending',
      storeName: matchedStore ? matchedStore.storeName : null,
      department: department,
      isValid: !!matchedStore,
      requestDate: newRequest.requestDate
    }
  });
}));

module.exports = router;