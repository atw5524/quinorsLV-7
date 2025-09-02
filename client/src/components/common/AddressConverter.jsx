import React, { useState, useEffect } from 'react';
import addressService from '../../services/addressService';

const AddressConverter = ({ 
  originalAddress, 
  onAddressConverted, 
  showOriginal = true,
  className = "" 
}) => {
  const [convertedData, setConvertedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (originalAddress && originalAddress.trim()) {
      convertAddress(originalAddress);
    } else {
      setConvertedData(null);
      setError('');
    }
  }, [originalAddress]);

  const convertAddress = async (address) => {
    setLoading(true);
    setError('');

    try {
      const result = await addressService.convertToAdminDong(address);
      
      if (result.success) {
        setConvertedData(result);
        onAddressConverted && onAddressConverted(result);
      } else {
        setError(result.error || '주소 변환에 실패했습니다');
        setConvertedData(null);
      }
    } catch (error) {
      setError('주소 변환 중 오류가 발생했습니다');
      setConvertedData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!originalAddress) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {/* 원본 도로명주소 (기존과 동일한 스타일) */}
      {showOriginal && (
        <div className="flex items-center gap-1">
          <i className="fa-solid fa-map-marker-alt text-blue-500"></i>
          <span className="text-xs text-gray-600 line-clamp-2">{originalAddress}</span>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center gap-1 mt-1">
          <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-xs text-blue-600">주소 변환 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-center gap-1 mt-1">
          <i className="fa-solid fa-exclamation-triangle text-red-500"></i>
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}

      {/* 변환된 지번주소 (기존 스타일과 동일하게) */}
      {convertedData && convertedData.success && convertedData.kakaoData?.jibunAddress && (
        <div className="flex items-center gap-1 mt-1">
          <i className="fa-solid fa-map-marker-alt text-green-500"></i>
          <span className="text-xs text-green-700 line-clamp-2">
            {convertedData.kakaoData.jibunAddress}
          </span>
        </div>
      )}
    </div>
  );
};

export default AddressConverter;