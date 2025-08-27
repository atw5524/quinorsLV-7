// server/routes/admin.js
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
router.put('/requests/:id/approve', auth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const { notes } = req.body;

    console.log('✅ 가입신청 승인 처리 시작:', requestId);

    // 가입신청 찾기
    const user = await User.findById(requestId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '가입신청을 찾을 수 없습니다.'
      });
    }

    // 이미 처리된 신청인지 확인
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `이미 ${user.status === 'approved' ? '승인' : '반려'}된 신청입니다.`
      });
    }

    // 승인 처리 - 비밀번호는 그대로 유지
    user.status = 'approved';
    user.processedAt = new Date();
    user.notes = notes || '관리자 승인 완료';
    user.updated_at = new Date();

    // 저장 (비밀번호는 변경하지 않음)
    await user.save();

    console.log('✅ 가입신청 승인 완료:', user.user_id);

    // 응답 (임시 비밀번호 정보 제거)
    res.json({
      success: true,
      message: '가입신청이 승인되었습니다.',
      data: {
        userId: user.user_id,
        userName: user.charge_name,
        storeName: user.cust_name,
        storeCode: user.dept_name,
        approvedAt: user.processedAt,
        // 임시 비밀번호 정보 제거
        message: '사용자는 가입신청 시 입력한 비밀번호로 로그인할 수 있습니다.'
      }
    });

  } catch (error) {
    console.error('✅ 가입신청 승인 실패:', error);
    res.status(500).json({
      success: false,
      message: '승인 처리 중 오류가 발생했습니다.'
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

    // 사용자 정보 업데이트
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
      .sort({ storeName: 1, department: 1 });

    console.log('🏪 ✅ 매장 목록 조회 완료:', stores.length);

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

// 🏪 매장 등록
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

    console.log('🏪 매장 등록 시작:', { storeName, department, storeCode });

    // 필수 필드 검증
    if (!storeName || !department || !storeCode || !managerName || !managerPhone) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요.'
      });
    }

    // 중복 매장코드 검사
    const existingStore = await Store.findOne({ storeCode: storeCode.toUpperCase() });
    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 매장코드입니다.'
      });
    }

    // 새 매장 생성
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

    console.log('🏪 ✅ 매장 등록 완료:', newStore.storeCode);

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
        message: '이미 등록된 매장코드입니다.'
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

    // 매장코드 중복 검사 (자신 제외)
    if (updateData.storeCode && updateData.storeCode !== store.storeCode) {
      const existingStore = await Store.findOne({ 
        storeCode: updateData.storeCode.toUpperCase(),
        _id: { $ne: id }
      });
      
      if (existingStore) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 매장코드입니다.'
        });
      }
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

    console.log('🏪 ✅ 매장 정보 수정 완료:', updatedStore.storeCode);

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

    console.log('🏪 ✅ 매장 삭제 완료:', store.storeCode);

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