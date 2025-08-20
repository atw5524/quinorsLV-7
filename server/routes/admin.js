const express = require('express');
const router = express.Router();
const AccountRequest = require('../models/AccountRequest');
const User = require('../models/User');
const crypto = require('crypto');

// 모든 신청 목록 조회
router.get('/requests', async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    
    const requests = await AccountRequest.find({ status })
      .sort({ requestDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AccountRequest.countDocuments({ status });

    res.json({
      success: true,
      data: requests,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: requests.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 계정 승인
router.post('/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

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
        message: '이미 처리된 신청입니다.'
      });
    }

    // 계정 ID 생성 (매장코드 + 랜덤번호)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const userId = `${request.storeCode}_${randomNum}`;
    
    // 임시 비밀번호 생성
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();

    // 사용자 계정 생성
    const newUser = new User({
      userId,
      password: tempPassword,
      managerName: request.managerName,
      storeCode: request.storeCode,
      phoneLast4: request.phoneLast4
    });

    await newUser.save();

    // 신청 상태 업데이트
    request.status = 'approved';
    request.processedDate = new Date();
    request.processedBy = 'admin'; // 실제로는 로그인한 관리자 ID
    request.notes = notes;
    request.generatedUserId = userId;
    request.generatedPassword = tempPassword;

    await request.save();

    res.json({
      success: true,
      message: '계정이 승인되었습니다.',
      data: {
        userId,
        tempPassword
      }
    });

  } catch (error) {
    console.error('승인 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 계정 거부
router.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    const request = await AccountRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '처리할 수 없는 신청입니다.'
      });
    }

    request.status = 'rejected';
    request.processedDate = new Date();
    request.processedBy = 'admin';
    request.notes = notes;

    await request.save();

    res.json({
      success: true,
      message: '신청이 거부되었습니다.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router;