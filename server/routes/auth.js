// server/routes/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Store = require('../models/Store');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// 로그인 시도 제한
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 시도
  message: {
    success: false,
    message: '너무 많은 로그인 시도가 있었습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 회원가입 시도 제한
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 3, // 최대 3회 시도
  message: {
    success: false,
    message: '너무 많은 회원가입 시도가 있었습니다. 1시간 후 다시 시도해주세요.'
  }
});

// 📝 회원가입 (기존 코드와 동일)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const {
      user_id,
      password,
      cust_name,
      dong_name,
      dong_detail,
      dept_name,
      charge_name,
      tel_no
    } = req.body;

    console.log('📝 회원가입 요청:', { user_id, cust_name, dept_name });

    // 필수 필드 검증
    if (!user_id || !password || !cust_name || !dong_name || !dept_name || !charge_name || !tel_no) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요.'
      });
    }

    // 아이디 형식 검증
    if (!/^[a-z0-9]+$/.test(user_id) || user_id.length < 6 || user_id.length > 20) {
      return res.status(400).json({
        success: false,
        message: '아이디는 영문 소문자와 숫자로 6-20자 이내로 입력해주세요.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 8자리 이상이어야 합니다.'
      });
    }

    // 매장코드 형식 검증
    if (!/^[A-Z0-9]+$/.test(dept_name) || dept_name.length < 3 || dept_name.length > 20) {
      return res.status(400).json({
        success: false,
        message: '매장코드는 영문 대문자와 숫자로 3-20자 이내로 입력해주세요.'
      });
    }

    // 연락처 형식 검증 (숫자만, 11자리)
    const phoneNumber = tel_no.toString();
    if (!/^010\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: '올바른 휴대폰 번호 형식이 아닙니다.'
      });
    }

    // 중복 아이디 검사
    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 아이디입니다. 다른 아이디를 사용해주세요.'
      });
    }

    // 중복 연락처 검사
    const existingPhone = await User.findOne({ tel_no: phoneNumber });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 연락처입니다. 다른 연락처를 사용해주세요.'
      });
    }

    // 사용자 생성
    const newUser = new User({
      user_id: user_id.toLowerCase().trim(),
      password: password.trim(),
      cust_name: cust_name.trim(),
      dong_name: dong_name.trim(),
      dong_detail: dong_detail?.trim() || '',
      dept_name: dept_name.toUpperCase().trim(),
      charge_name: charge_name.trim(),
      tel_no: phoneNumber,
      status: 'pending'
    });

    await newUser.save();

    console.log('✅ 회원가입 완료:', user_id);

    res.status(201).json({
      success: true,
      message: '회원가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
      data: {
        requestId: newUser._id,
        user_id: newUser.user_id,
        cust_name: newUser.cust_name,
        charge_name: newUser.charge_name,
        requestDate: newUser.createdAt,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('❌ 회원가입 에러:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const messages = {
        user_id: '이미 사용 중인 아이디입니다.',
        tel_no: '이미 등록된 연락처입니다.'
      };
      return res.status(409).json({
        success: false,
        message: messages[field] || '중복된 정보가 있습니다.'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || '입력 정보를 확인해주세요.'
      });
    }

    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

// 🔐 로그인 - 수정됨 (tel_no 필드 추가)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { user_id, password, rememberMe } = req.body;

    console.log('🔐 로그인 시도:', { user_id });

    // 필수 필드 검증
    if (!user_id || !password) {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 찾기 (user_id로 검색)
    const user = await User.findOne({ user_id: user_id.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 계정 상태 확인
    if (user.status !== 'approved') {
      const statusMessages = {
        pending: '계정 승인 대기 중입니다. 관리자 승인을 기다려주세요.',
        rejected: '계정이 반려되었습니다. 관리자에게 문의하세요.'
      };
      return res.status(403).json({
        success: false,
        message: statusMessages[user.status] || '계정 상태를 확인해주세요.'
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // JWT 토큰 생성
    const tokenExpiry = rememberMe ? '30d' : '1d';
    const token = jwt.sign(
      {
        userId: user._id,
        user_id: user.user_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    // 마지막 로그인 시간 업데이트
    user.lastLoginAt = new Date();
    await user.save();

    console.log('✅ 로그인 성공:', user.user_id);
    console.log('🔍 로그인 응답에 포함될 tel_no:', user.tel_no);

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token,
        user: {
          _id: user._id,
          user_id: user.user_id,
          cust_name: user.cust_name,
          dept_name: user.dept_name,
          charge_name: user.charge_name,
          tel_no: user.tel_no, // 🎯 tel_no 필드 추가!
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          // 추가 필드들도 포함
          dong_name: user.dong_name,
          dong_detail: user.dong_detail,
          status: user.status,
          department: user.department,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('❌ 로그인 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

// 🔑 비밀번호 변경 (기존과 동일)
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 8자리 이상이어야 합니다.'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    user.password = newPassword;
    user.updated_at = new Date();
    await user.save();

    console.log('✅ 비밀번호 변경 완료:', user.user_id);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ 비밀번호 변경 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 👤 내 정보 조회 - 수정됨 (tel_no 포함)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log('👤 /me 엔드포인트 - tel_no 확인:', user.tel_no);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ 사용자 정보 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 👤 프로필 조회 - 수정됨 (userId 필드 수정)
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('👤 사용자 프로필 조회 시작:', req.user.userId); // req.user.id -> req.user.userId로 수정

    const user = await User.findById(req.user.userId) // req.user.id -> req.user.userId로 수정
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log('👤 ✅ 사용자 프로필 조회 성공:', user.user_id);
    console.log('👤 프로필 조회 - tel_no 확인:', user.tel_no);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('👤 ❌ 사용자 프로필 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
});

// 🎯 새로 추가: 사용자 ID로 사용자 정보 조회 (FloatingPreview용)
router.get('/stores/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('👤 사용자 정보 조회 시작 (userId):', userId);

    const user = await User.findOne({ user_id: userId })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log('👤 ✅ 사용자 정보 조회 성공:', user.user_id);
    console.log('👤 tel_no 확인:', user.tel_no);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('👤 ❌ 사용자 정보 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

// 🔍 토큰 유효성 검사 (기존과 동일)
router.get('/validate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: '계정이 비활성화되었습니다.'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ 토큰 검증 에러:', error);
    res.status(401).json({
      success: false,
      message: '토큰 검증에 실패했습니다.'
    });
  }
});

// 🏪 일반 사용자용 매장 목록 조회 (기존과 동일)
router.get('/stores', auth, async (req, res) => {
  try {
    console.log('🏪 일반 사용자용 매장 목록 조회 시작');
    console.log('🏪 요청 사용자:', req.user.userId);

    const { active = 'true', limit = 100, search } = req.query;

    let query = {};

    // 활성 매장만 조회
    if (active === 'true') {
      query.isActive = { $ne: false };
    }

    // 검색 조건 추가
    if (search && search.trim()) {
      query.$or = [
        { storeName: { $regex: search.trim(), $options: 'i' } },
        { storeCode: { $regex: search.trim(), $options: 'i' } },
        { managerName: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const stores = await Store.find(query)
      .sort({ storeName: 1, department: 1 })
      .limit(parseInt(limit))
      .lean();

    console.log('🏪 조회된 매장 수:', stores.length);

    // 매장별로 그룹화하여 부서 정보 구성
    const groupedStores = {};

    stores.forEach(store => {
      const storeName = store.storeName;

      if (!groupedStores[storeName]) {
        groupedStores[storeName] = {
          _id: store._id,
          storeName: store.storeName,
          storeCode: store.storeCode,
          address: store.address,
          isActive: store.isActive,
          createdAt: store.createdAt,
          departments: []
        };
      }

      // 부서 정보 추가
      groupedStores[storeName].departments.push({
        department: store.department,
        managerName: store.managerName,
        managerPhone: store.managerPhone,
        fullPhone: store.managerPhone ? store.managerPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : ''
      });
    });

    // 배열로 변환
    const result = Object.values(groupedStores);

    console.log('🏪 ✅ 매장 목록 조회 성공:', result.length, '개 매장');

    res.json({
      success: true,
      data: result,
      total: result.length
    });

  } catch (error) {
    console.error('🏪 ❌ 매장 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '매장 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;