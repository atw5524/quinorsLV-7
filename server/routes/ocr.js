// server/routes/ocr.js
const express = require('express');
const router = express.Router();

// Google Cloud Vision OCR 엔드포인트
router.post('/google-vision', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image data required' 
      });
    }

    if (!process.env.GOOGLE_VISION_API_KEY) {
      return res.status(500).json({ 
        success: false,
        error: 'Google Vision API key not configured' 
      });
    }

    console.log('Google Vision API 호출 시작...');

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: image
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 50
          }]
        }]
      })
    });

    const result = await response.json();
    console.log('Google Vision API 응답 받음');

    if (result.error) {
      console.error('Google Vision API 오류:', result.error);
      return res.status(400).json({ 
        success: false,
        error: result.error.message 
      });
    }

    if (!result.responses || !result.responses[0] || !result.responses[0].textAnnotations) {
      return res.json({ 
        success: true,
        texts: [], 
        fullText: '' 
      });
    }

    const textAnnotations = result.responses[0].textAnnotations;
    
    if (textAnnotations.length === 0) {
      return res.json({ 
        success: true,
        texts: [], 
        fullText: '' 
      });
    }

    // 개별 텍스트 블록들 추출
    const extractedTexts = textAnnotations.slice(1)
      .map(annotation => annotation.description.trim())
      .filter(text => {
        return text.length >= 1 && 
               text.length <= 50 && 
               /[a-zA-Z0-9가-힣]/.test(text);
      })
      .slice(0, 20);

    res.json({ 
      success: true,
      texts: extractedTexts,
      fullText: textAnnotations[0].description,
      confidence: result.responses[0].textAnnotations[0].confidence || 'N/A'
    });

  } catch (error) {
    console.error('OCR API 처리 오류:', error);
    res.status(500).json({ 
      success: false,
      error: 'OCR 처리 실패: ' + error.message 
    });
  }
});

// 테스트용 엔드포인트
router.get('/test', async (req, res) => {
  try {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      return res.status(500).json({ 
        success: false,
        error: 'GOOGLE_VISION_API_KEY 환경변수가 설정되지 않았습니다.' 
      });
    }

    // 테스트용 이미지로 API 호출
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            source: {
              imageUri: "https://cloud.google.com/vision/docs/images/text_1.jpg"
            }
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 10
          }]
        }]
      })
    });

    const result = await response.json();
    
    if (result.error) {
      return res.status(400).json({ 
        success: false,
        error: result.error.message,
        details: result.error
      });
    }

    res.json({ 
      success: true, 
      message: 'Google Vision API 연결 성공!',
      extractedTexts: result.responses[0].textAnnotations?.slice(1, 6).map(t => t.description) || []
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;