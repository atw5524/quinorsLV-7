class AddressService {
  constructor() {
    this.API_BASE_URL = process.env.NODE_ENV === 'production' 
      ? 'https://quinors-lv-backend.ngrok.io/api'
      : 'https://quinors-lv-backend.ngrok.io/api';
  }

  // 접수 API용 행정동 변환 (카카오 API 사용)
  async convertToAdminDong(roadAddress) {
    try {
      if (!roadAddress || typeof roadAddress !== 'string') {
        throw new Error('유효하지 않은 주소입니다');
      }

      console.log('🔄 카카오 API 주소 변환 시작:', roadAddress);
      
      const response = await fetch(`${this.API_BASE_URL}/address/convert-to-dong`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roadAddress: roadAddress.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API 호출 실패 (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ 주소 변환 성공:', result.data);
        
        return {
          success: true,
          original: result.data.original,
          converted: result.data.converted,
          // 접수 API용 간단한 주소
          dongAddress: result.data.converted.fullDongAddress,
          // 상세 정보
          details: {
            sido: result.data.converted.sido,
            sigungu: result.data.converted.sigungu,
            adminDong: result.data.converted.adminDong,
            legalDong: result.data.converted.legalDong,
            coordinates: result.data.converted.coordinates
          },
          kakaoData: result.data.kakaoData
        };
      } else {
        throw new Error(result.error || '주소 변환에 실패했습니다');
      }
      
    } catch (error) {
      console.error('❌ 주소 변환 실패:', error);
      return {
        success: false,
        error: error.message,
        original: roadAddress,
        dongAddress: roadAddress, // fallback으로 원본 주소 사용
        converted: null
      };
    }
  }

  // 주소 검색 (자동완성용)
  async searchAddress(query) {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: [] };
      }

      const response = await fetch(`${this.API_BASE_URL}/address/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 5
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        };
      }
      
      return { success: false, data: [], error: result.error };
      
    } catch (error) {
      console.error('❌ 주소 검색 실패:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  // API 연결 테스트
  async testKakaoAPI() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/address/test-kakao`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new AddressService();