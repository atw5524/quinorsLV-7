const express = require('express');
const router = express.Router();

// 카카오 주소 검색 API를 사용한 주소 변환
router.post('/convert-to-dong', async (req, res) => {
  try {
    const { roadAddress } = req.body;
    
    if (!roadAddress) {
      return res.status(400).json({
        success: false,
        error: '주소가 필요합니다'
      });
    }

    if (!process.env.KAKAO_REST_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Kakao API 키가 설정되지 않았습니다'
      });
    }

    console.log('🔄 카카오 API 주소 변환 시작:', roadAddress);

    // 카카오 주소 검색 API 호출
    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(roadAddress)}`;
    
    const response = await fetch(kakaoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`카카오 API 호출 실패: ${response.status}`);
    }

    const kakaoData = await response.json();
    console.log('카카오 API 응답:', JSON.stringify(kakaoData, null, 2));
    
    if (!kakaoData.documents || kakaoData.documents.length === 0) {
      throw new Error('주소를 찾을 수 없습니다');
    }

    const addressInfo = kakaoData.documents[0];
    
    // 주소 정보 추출
    let sido = '';
    let sigungu = '';
    let adminDong = '';
    let legalDong = '';
    
    // 도로명 주소 정보에서 추출
    if (addressInfo.road_address) {
      sido = addressInfo.road_address.region_1depth_name || '';
      sigungu = addressInfo.road_address.region_2depth_name || '';
      adminDong = addressInfo.road_address.region_3depth_name || '';
    }
    
    // 지번 주소 정보에서 보완 (더 정확한 행정동 정보)
    if (addressInfo.address) {
      if (!sido) sido = addressInfo.address.region_1depth_name || '';
      if (!sigungu) sigungu = addressInfo.address.region_2depth_name || '';
      if (!adminDong) adminDong = addressInfo.address.region_3depth_name || '';
      
      // 법정동 정보
      legalDong = addressInfo.address.region_3depth_name || '';
      
      // 지번 주소에서 더 세부적인 동 정보 추출
      const addressName = addressInfo.address.address_name;
      const addressParts = addressName.split(' ');
      
      // "동"이 포함된 부분 찾기
      for (let i = 0; i < addressParts.length; i++) {
        const part = addressParts[i];
        if (part.includes('동') && !part.includes('로') && !part.includes('길')) {
          adminDong = part;
          break;
        }
      }
    }

    // 결과 구성
    const result = {
      original: roadAddress,
      converted: {
        sido: sido,
        sigungu: sigungu,
        adminDong: adminDong,
        legalDong: legalDong,
        fullDongAddress: `${sido} ${sigungu} ${adminDong}`.replace(/\s+/g, ' ').trim(),
        coordinates: {
          lat: parseFloat(addressInfo.y || 0),
          lng: parseFloat(addressInfo.x || 0)
        }
      },
      kakaoData: {
        roadAddress: addressInfo.road_address?.address_name || '',
        jibunAddress: addressInfo.address?.address_name || ''
      }
    };

    console.log('✅ 주소 변환 완료:', result);

    res.json({
      success: true,
      data: result,
      message: '주소 변환 완료'
    });

  } catch (error) {
    console.error('❌ 주소 변환 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message || '주소 변환 중 오류가 발생했습니다'
    });
  }
});

// 주소 유효성 검사 및 제안
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        message: '검색어가 너무 짧습니다'
      });
    }

    if (!process.env.KAKAO_REST_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Kakao API 키가 설정되지 않았습니다'
      });
    }

    console.log('🔍 카카오 주소 검색:', query);

    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=${limit}`;
    
    const response = await fetch(kakaoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`카카오 API 호출 실패: ${response.status}`);
    }

    const kakaoData = await response.json();
    
    const suggestions = kakaoData.documents.map(doc => ({
      roadAddress: doc.road_address?.address_name || '',
      jibunAddress: doc.address?.address_name || '',
      sido: doc.road_address?.region_1depth_name || doc.address?.region_1depth_name,
      sigungu: doc.road_address?.region_2depth_name || doc.address?.region_2depth_name,
      dong: doc.road_address?.region_3depth_name || doc.address?.region_3depth_name
    })).filter(item => item.roadAddress || item.jibunAddress);

    res.json({
      success: true,
      data: suggestions,
      message: `${suggestions.length}개의 주소를 찾았습니다`
    });

  } catch (error) {
    console.error('❌ 주소 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API 테스트 엔드포인트
router.get('/test-kakao', async (req, res) => {
  try {
    if (!process.env.KAKAO_REST_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.'
      });
    }

    // 테스트 주소로 API 호출
    const testAddress = '서울특별시 강남구 테헤란로 123';
    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(testAddress)}`;
    
    const response = await fetch(kakaoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.documents && result.documents.length > 0) {
      res.json({
        success: true,
        message: '카카오 API 연결 성공!',
        testResult: result.documents[0]
      });
    } else {
      res.json({
        success: false,
        message: '카카오 API 응답이 비어있습니다',
        result: result
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;