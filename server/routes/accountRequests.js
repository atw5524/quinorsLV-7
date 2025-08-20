const express = require('express');
const router = express.Router();
const AccountRequest = require('../models/AccountRequest');

// 계정 발급 신청
router.post('/', async (req, res) => {
  try {
    const { managerName, storeCode, phoneLast4 } = req.body;

    // 입력값 검증
    if (!managerName || !storeCode || !phoneLast4) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요.'
      });
    }

    if (phoneLast4.length !== 4) {
      return res.status(400).json({
        success: false,
        message: '연락처 뒷 4자리를 정확히 입력해주세요.'
      });
    }

    // 중복 신청 확인 (같은 매장코드 + 연락처)
    const existingRequest = await AccountRequest.findOne({
      storeCode,
      phoneLast4,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: '이미 신청된 정보입니다.'
      });
    }

    // 새 신청 생성
    const newRequest = new AccountRequest({
      managerName,
      storeCode,
      phoneLast4
    });

    const savedRequest = await newRequest.save();

    res.status(201).json({
      success: true,
      message: '계정 발급 신청이 완료되었습니다.',
      data: {
        requestId: savedRequest._id,
        requestDate: savedRequest.requestDate
      }
    });

  } catch (error) {
    console.error('계정 신청 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 신청 상태 확인
router.get('/status/:requestId', async (req, res) => {
  try {
    const request = await AccountRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '신청 정보를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: {
        status: request.status,
        requestDate: request.requestDate,
        processedDate: request.processedDate,
        generatedUserId: request.generatedUserId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router;