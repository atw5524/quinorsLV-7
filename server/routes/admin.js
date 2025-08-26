const express = require('express');
const router = express.Router();

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateUserId, generateTempPassword, checkUserAccountsForDepartments } = require('../utils/helpers');

const User = require('../models/User');
const Store = require('../models/Store');
const AccountRequest = require('../models/Register');

// 모든 관리자 라우트에 인증 및 관리자 권한 확인 적용
router.use(authenticateToken);
router.use(requireAdmin);

// ===== 통계 및 대시보드 API들 =====

// 통계 조회 API
router.get('/stats', asyncHandler(async (req, res) => {
  const storeStats = await Store.getStats();
  const requestStats = await AccountRequest.getStats();
  const userStats = await User.getStats();

  res.json({
    success: true,
    data: {
      stores: {
        totalStores: storeStats.total,
        totalDepartments: storeStats.departmentStats?.total || 0,
        totalManagers: storeStats.departmentStats?.withManager || 0
      },
      requests: requestStats,
      users: userStats
    }
  });
}));

// ===== 가입신청 관리 API들 =====

// 가입신청 목록 조회
router.get('/registers', asyncHandler(async (req, res) => {
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
}));

// 🎯 새로운 API: 가입신청 승인
router.put('/requests/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes = '관리자 승인 완료' } = req.body;

  const request = await AccountRequest.findById(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: '가입신청을 찾을 수 없습니다.'
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
  const userId = generateUserId(request.storeCode, request.department);
  const tempPassword = generateTempPassword();

  // 신청 승인 처리
  request.status = 'manual_approved';
  request.processedAt = new Date();
  request.processedBy = req.user.userId;
  request.notes = notes;
  request.generatedUserId = userId;
  request.tempPassword = tempPassword;

  await request.save();

  // 사용자 계정 생성
  const newUser = new User({
    userId: userId,
    password: tempPassword, // pre-save hook에서 자동 해시화
    managerName: request.managerName,
    storeCode: request.storeCode,
    phoneLast4: request.phoneLast4,
    department: request.department || null,
    role: 'user',
    permissions: ['read', 'write'],
    requestId: request._id
  });

  await newUser.save();

  console.log('✅ 관리자 승인 완료:', { userId, requestId: id });

  res.json({
    success: true,
    message: '가입신청이 승인되었습니다.',
    data: {
      userId: userId,
      tempPassword: tempPassword,
      managerName: request.managerName,
      storeCode: request.storeCode,
      department: request.department
    }
  });
}));

// 🎯 새로운 API: 가입신청 반려
router.put('/requests/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({
      success: false,
      message: '반려 사유를 입력해주세요.'
    });
  }

  const request = await AccountRequest.findById(id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: '가입신청을 찾을 수 없습니다.'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: '이미 처리된 신청입니다.',
      currentStatus: request.status
    });
  }

  // 신청 반려 처리
  request.status = 'rejected';
  request.processedAt = new Date();
  request.processedBy = req.user.userId;
  request.notes = notes;

  await request.save();

  console.log('❌ 관리자 반려 완료:', { requestId: id, notes });

  res.json({
    success: true,
    message: '가입신청이 반려되었습니다.',
    data: {
      requestId: id,
      notes: notes
    }
  });
}));

// ===== 매장 관리 API들 =====

// 매장 목록 조회 - 실제 User 계정 존재 여부 확인
router.get('/stores', asyncHandler(async (req, res) => {
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

  // 각 매장의 부서별 실제 User 계정 존재 여부 확인
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
}));

// 매장 등록 - 부서별 담당자 지원
router.post('/stores', asyncHandler(async (req, res) => {
  console.log('📥 매장 등록 요청 받음');
  console.log('📝 요청 바디:', req.body);

  const { storeCode, storeName, address, notes, departments } = req.body;

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

    // phoneLast4 자동 생성
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
      phoneLast4: dept.phoneLast4,
      accountIssued: false
    })),
    createdBy: req.user.userId
  };

  console.log('💾 저장할 데이터:', storeData);

  const newStore = new Store(storeData);
  const savedStore = await newStore.save();

  console.log('✅ 매장 저장 완료:', savedStore._id);

  res.status(201).json({
    success: true,
    message: '매장이 등록되었습니다.',
    data: savedStore
  });
}));

// 매장 수정 - User 계정과 동기화
router.put('/stores/:storeId', asyncHandler(async (req, res) => {
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

      // phoneLast4 자동 생성
      if (!dept.phoneLast4) {
        const phoneNumbers = dept.fullPhone.replace(/[^0-9]/g, '');
        dept.phoneLast4 = phoneNumbers.slice(-4);
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
}));

// 매장 삭제 (비활성화)
router.delete('/stores/:storeId', asyncHandler(async (req, res) => {
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
}));

// ===== 회원 관리 API들 =====

// 승인된 회원 목록 조회
router.get('/users', asyncHandler(async (req, res) => {
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
}));

// 🎯 새로운 API: 회원정보 수정
router.put('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;

  // 기본 정보 검증
  if (updateData.managerName && !updateData.managerName.trim()) {
    return res.status(400).json({
      success: false,
      message: '담당자명은 필수 입력 항목입니다.'
    });
  }

  // 전화번호 형식 검증 (있는 경우)
  if (updateData.fullPhone) {
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(updateData.fullPhone)) {
      return res.status(400).json({
        success: false,
        message: '올바른 휴대폰 번호 형식으로 입력해주세요. (010-0000-0000)'
      });
    }
    // phoneLast4 자동 추출
    const phoneNumbers = updateData.fullPhone.replace(/[^0-9]/g, '');
    updateData.phoneLast4 = phoneNumbers.slice(-4);
  }

  const user = await User.findOne({ userId: userId });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '사용자를 찾을 수 없습니다.'
    });
  }

  // 업데이트할 필드만 선택 (보안상 중요한 필드는 제외)
  const allowedUpdates = [
    'managerName', 'phoneLast4', 'department', 'notes'
  ];

  const filteredUpdateData = {};
  allowedUpdates.forEach(field => {
    if (updateData[field] !== undefined) {
      filteredUpdateData[field] = updateData[field];
    }
  });

  filteredUpdateData.updatedAt = new Date();

  const updatedUser = await User.findOneAndUpdate(
    { userId: userId },
    filteredUpdateData,
    { new: true, runValidators: true }
  );

  console.log('✅ 회원정보 수정 완료:', { userId, managerName: updatedUser.managerName });

  res.json({
    success: true,
    message: '회원정보가 성공적으로 수정되었습니다.',
    data: updatedUser
  });
}));

// 🎯 새로운 API: 계정 활성화/비활성화
router.put('/users/:userId/status', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive, notes } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive 값은 boolean이어야 합니다.'
    });
  }

  const user = await User.findOne({ userId: userId });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '사용자를 찾을 수 없습니다.'
    });
  }

  user.isActive = isActive;
  if (!isActive) {
    user.deactivatedAt = new Date();
    user.deactivationReason = notes || '관리자에 의한 계정 비활성화';
  } else {
    user.deactivatedAt = null;
    user.deactivationReason = null;
  }

  await user.save();

  console.log(`🔄 계정 상태 변경 완료: ${userId} -> ${isActive ? '활성' : '비활성'}`);

  res.json({
    success: true,
    message: `계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
    data: {
      userId: user.userId,
      isActive: user.isActive,
      managerName: user.managerName
    }
  });
}));

// 🎯 새로운 API: 비밀번호 초기화
router.post('/users/:userId/reset-password', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({ userId: userId });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '사용자를 찾을 수 없습니다.'
    });
  }

  // 새로운 임시 비밀번호 생성
  const tempPassword = generateTempPassword();

  // 비밀번호 초기화 (인스턴스 메서드 사용)
  await user.resetPassword(tempPassword);

  console.log('🔑 비밀번호 초기화 완료:', { userId, managerName: user.managerName });

  res.json({
    success: true,
    message: '비밀번호가 초기화되었습니다.',
    data: {
      userId: user.userId,
      tempPassword: tempPassword,
      managerName: user.managerName
    }
  });
}));

module.exports = router;