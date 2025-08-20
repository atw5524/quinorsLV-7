const express = require('express');
const router = express.Router();

// 테스트 라우트
router.get('/test', (req, res) => {
  res.json({ message: 'Auth route is working!' });
});

// 로그인 라우트 (임시)
router.post('/login', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Login endpoint - 구현 예정' 
  });
});

module.exports = router;