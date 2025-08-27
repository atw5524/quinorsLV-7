const express = require('express');
const User = require('../models/User');
const Store = require('../models/Store');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

// 관리자 작업 제한
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 최대 30회 요청
  message: {
    success: false,
    message: '너무 많은 관리자 요청이 있었습니다. 잠시 후 다시 시도해주세요.'
  }
});

// 모든 관리자 라우트에 인증 미들웨어 적용
router.use(auth);
router.use(adminAuth);
router.use(adminLimiter);

// 📊 관리자 통계 조회
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 관리자 통계 조회 시작');

    // 가입신청 통계
    const totalRequests = await User.countDocuments();
    const pendingRequests = await User.countDocuments({ status: 'pending' });
    const approvedRequests = await User.countDocuments({ status: 'approved' });
    const rejectedRequests = await User.countDocuments({ status: 'rejected' });

    // 매장 통계
    const totalStores = await Store.countDocuments();
    const uniqueStoreNames = await Store.distinct('storeName');
    const totalDepartments = totalStores;
    const storesWithManagers = await Store.countDocuments({ managerName: { $exists: true, $ne: '' } });

    // 사용자 통계
    const totalUsers = await User.countDocuments({ status: 'approved' });
    const activeUsers = await User.countDocuments({ status: 'approved', isActive: { $ne: false } });
    const inactiveUsers = await User.countDocuments({ status: 'approved', isActive: false });

    const stats = {
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests
      },
      stores: {
        totalStores: uniqueStoreNames.length,
        totalDepartments: totalDepartments,
        totalManagers: storesWithManagers,
        activeStores: totalStores
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers
      }
    };

    console.log('📊 ✅ 관리자 통계 조회 완료:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('📊 ❌ 관리자 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 📋 가입신청 목록 조회
router.get('/requests', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    
    console.log('📋 가입신청 목록 조회 시작:', { status, page, limit });

    let query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const requests = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    console.log('📋 ✅ 가입신청 목록 조회 완료:', requests.length);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Math.ceil(total / parseInt(limit)),
        totalItems: total
      }
    });

  } catch (error) {
    console.error('📋 ❌ 가입신청 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '가입신청 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// ✅ 가입신청 승인
router.put('/requests/:id/approve', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { notes } = req.body;

    console.log('✅ 가입신청 승인 처리 시작:', requestId);

    // 1. 요청 ID 유효성 검사
    if (!requestId || !requestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('❌ 잘못된 요청 ID:', requestId);
      return res.status(400).json({
        success: false,
        message: '잘못된 요청 ID입니다.'
      });
    }

    // 2. 사용자 찾기
    const user = await User.findById(requestId);
    if (!user) {
      console.error('❌ 사용자를 찾을 수 없음:', requestId);
      return res.status(404).json({
        success: false,
        message: '가입신청을 찾을 수 없습니다.'
      });
    }

    console.log('📋 승인할 사용자:', {
      id: user._id,
      user_id: user.user_id,
      name: user.charge_name,
      status: user.status
    });

    // 3. 이미 처리된 신청인지 확인
    if (user.status !== 'pending') {
      console.error('❌ 이미 처리된 신청:', user.status);
      return res.status(400).json({
        success: false,
        message: `이미 ${user.status === 'approved' ? '승인' : '반려'}된 신청입니다.`
      });
    }

    // 4. 사용자 승인 처리
    try {
      user.status = 'approved';
      user.processedAt = new Date();
      user.notes = notes || '관리자 승인 완료';
      user.updated_at = new Date();
      await user.save();
      console.log('✅ 사용자 승인 완료:', user.user_id);
    } catch (userError) {
      console.error('❌ 사용자 승인 실패:', userError);
      return res.status(500).json({
        success: false,
        message: '사용자 승인 중 오류가 발생했습니다: ' + userError.message
      });
    }

    // 5. Store 컬렉션에 추가 (안전하게)
    let storeCreated = false;
    try {
      console.log('🏪 Store 생성 시도:', {
        storeName: user.cust_name,
        storeCode: user.dept_name,
        managerName: user.charge_name
      });

      const newStore = new Store({
        storeName: user.cust_name,
        department: '여성',
        storeCode: user.dept_name,
        address: user.dong_name + (user.dong_detail ? ' ' + user.dong_detail : ''),
        managerName: user.charge_name,
        managerPhone: user.tel_no,
        notes: `${user.user_id} 사용자 승인으로 자동 생성`,
        isActive: true
      });

      await newStore.save();
      storeCreated = true;
      console.log('🏪 ✅ Store 생성 완료:', newStore._id);

    } catch (storeError) {
      console.error('🏪 ❌ Store 생성 실패:', {
        message: storeError.message,
        code: storeError.code,
        keyPattern: storeError.keyPattern
      });
      
      // Store 생성 실패해도 승인은 계속 진행
      storeCreated = false;
    }

    // 6. 성공 응답
    console.log('✅ 승인 처리 완료:', user.user_id);
    
    res.json({
      success: true,
      message: '가입신청이 승인되었습니다.',
      data: {
        userId: user.user_id,
        userName: user.charge_name,
        storeName: user.cust_name,
        storeCode: user.dept_name,
        approvedAt: user.processedAt,
        storeCreated: storeCreated,
        warning: storeCreated ? null : 'Store 생성에 실패했지만 사용자 승인은 완료되었습니다.'
      }
    });

  } catch (error) {
    console.error('❌ 승인 처리 전체 실패:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '승인 처리 중 오류가 발생했습니다: ' + error.message
    });
  }
});

// ❌ 가입신청 반려
router.put('/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    console.log('❌ 가입신청 반려 시작:', id);

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '반려 사유를 입력해주세요.'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '가입신청을 찾을 수 없습니다.'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '이미 처리된 신청입니다.'
      });
    }

    user.status = 'rejected';
    user.processedAt = new Date();
    user.notes = notes.trim();
    user.updated_at = new Date();
    await user.save();

    console.log('❌ 가입신청 반려 완료:', user.user_id);

    res.json({
      success: true,
      message: '가입신청이 반려되었습니다.',
      data: {
        userId: user.user_id,
        rejectedAt: user.processedAt,
        reason: notes.trim()
      }
    });

  } catch (error) {
    console.error('❌ 가입신청 반려 실패:', error);
    res.status(500).json({
      success: false,
      message: '반려 처리 중 오류가 발생했습니다.'
    });
  }
});

// 🏪 매장 목록 조회
router.get('/stores', async (req, res) => {
  try {
    console.log('🏪 매장 목록 조회 시작');
    
    const stores = await Store.find()
      .sort({ storeName: 1, department: 1, managerName: 1 });
    
    console.log('🏪 ✅ 매장 목록 조회 완료:', stores.length, '개 엔트리');
    console.log('🏪 📋 매장 목록 상세:', stores.map(s => ({
      storeName: s.storeName,
      storeCode: s.storeCode,
      managerName: s.managerName,
      department: s.department
    })));

    res.json({
      success: true,
      data: stores
    });

  } catch (error) {
    console.error('🏪 ❌ 매장 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '매장 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 🏪 매장 등록 (수정됨 - 중복 검사 제거)
router.post('/stores', async (req, res) => {
  try {
    const {
      storeName,
      department,
      storeCode,
      address,
      managerName,
      managerPhone,
      notes
    } = req.body;

    console.log('🏪 매장 등록 시작:', { storeName, department, storeCode, managerName });

    // 필수 필드 검증
    if (!storeName || !department || !storeCode || !managerName || !managerPhone) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요.'
      });
    }

    // ✅ 중복 매장코드 검사 제거 - 같은 매장에 여러 담당자 허용
    // 복합 인덱스로 같은 매장의 같은 담당자만 중복 방지됨

    // 새 매장/담당자 생성
    const newStore = new Store({
      storeName: storeName.trim(),
      department,
      storeCode: storeCode.toUpperCase().trim(),
      address: address?.trim() || '',
      managerName: managerName.trim(),
      managerPhone,
      notes: notes?.trim() || '',
      isActive: true
    });

    await newStore.save();

    console.log('🏪 ✅ 매장 등록 완료:', newStore.storeCode, newStore.managerName);

    res.status(201).json({
      success: true,
      message: '매장이 성공적으로 등록되었습니다.',
      data: newStore
    });

  } catch (error) {
    console.error('🏪 ❌ 매장 등록 실패:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '동일한 매장의 동일한 담당자가 이미 등록되어 있습니다.'
      });
    }

    res.status(500).json({
      success: false,
      message: '매장 등록 중 오류가 발생했습니다.'
    });
  }
});

// 🏪 매장 정보 수정
router.put('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🏪 매장 정보 수정 시작:', id);

    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    // 업데이트 가능한 필드만 추출
    const allowedFields = ['storeName', 'department', 'storeCode', 'address', 'managerName', 'managerPhone', 'notes'];
    const filteredUpdate = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = field === 'storeCode' ? updateData[field].toUpperCase() : updateData[field];
      }
    });

    filteredUpdate.updatedAt = new Date();

    const updatedStore = await Store.findByIdAndUpdate(
      id,
      filteredUpdate,
      { new: true, runValidators: true }
    );

    console.log('🏪 ✅ 매장 정보 수정 완료:', updatedStore.storeCode, updatedStore.managerName);

    res.json({
      success: true,
      message: '매장 정보가 성공적으로 수정되었습니다.',
      data: updatedStore
    });

  } catch (error) {
    console.error('🏪 ❌ 매장 정보 수정 실패:', error);
    res.status(500).json({
      success: false,
      message: '매장 정보 수정 중 오류가 발생했습니다.'
    });
  }
});

// 🏪 매장 삭제
router.delete('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🏪 매장 삭제 시작:', id);

    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: '매장을 찾을 수 없습니다.'
      });
    }

    await Store.findByIdAndDelete(id);

    console.log('🏪 ✅ 매장 삭제 완료:', store.storeCode, store.managerName);

    res.json({
      success: true,
      message: '매장이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('🏪 ❌ 매장 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '매장 삭제 중 오류가 발생했습니다.'
    });
  }
});

// 👥 승인된 사용자 목록 조회
router.get('/users', async (req, res) => {
  try {
    console.log('👥 승인된 사용자 목록 조회 시작');

    const users = await User.find({ status: 'approved' })
      .select('-password')
      .sort({ createdAt: -1 });

    console.log('👥 ✅ 승인된 사용자 목록 조회 완료:', users.length);

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('👥 ❌ 승인된 사용자 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 👥 사용자 정보 수정
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('👥 사용자 정보 수정 시작:', id);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 업데이트 가능한 필드만 추출
    const allowedFields = ['cust_name', 'charge_name', 'tel_no', 'dept_name', 'dong_name', 'dong_detail', 'notes'];
    const filteredUpdate = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    });

    filteredUpdate.updated_at = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      id,
      filteredUpdate,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('👥 ✅ 사용자 정보 수정 완료:', updatedUser.user_id);

    res.json({
      success: true,
      message: '사용자 정보가 성공적으로 수정되었습니다.',
      data: updatedUser
    });

  } catch (error) {
    console.error('👥 ❌ 사용자 정보 수정 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 수정 중 오류가 발생했습니다.'
    });
  }
});

// 👥 사용자 활성화/비활성화
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, notes } = req.body;

    console.log('👥 사용자 상태 변경 시작:', id, { isActive });

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    user.isActive = isActive;
    user.notes = notes || user.notes;
    user.updated_at = new Date();
    await user.save();

    console.log('👥 ✅ 사용자 상태 변경 완료:', user.user_id);

    res.json({
      success: true,
      message: `사용자가 성공적으로 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
      data: {
        userId: user.user_id,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('👥 ❌ 사용자 상태 변경 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 상태 변경 중 오류가 발생했습니다.'
    });
  }
});

// 🔑 사용자 비밀번호 초기화
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔑 비밀번호 초기화 시작:', id);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 새 임시 비밀번호 생성
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(12);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

    user.password = hashedTempPassword;
    user.updated_at = new Date();
    await user.save();

    console.log('🔑 ✅ 비밀번호 초기화 완료:', user.user_id);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 초기화되었습니다.',
      data: {
        userId: user.user_id,
        tempPassword: tempPassword
      }
    });

  } catch (error) {
    console.error('🔑 ❌ 비밀번호 초기화 실패:', error);
    res.status(500).json({
      success: false,
      message: '비밀번호 초기화 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;