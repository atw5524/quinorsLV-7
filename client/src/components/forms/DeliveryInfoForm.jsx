import React, { useState, useRef, useEffect } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';

const DeliveryInfoForm = () => {
  const { deliveryType, originStore, destinationStore, dispatch } = useDelivery();
  const { token } = useAuth();

  // 기존 물품 정보 상태
  const [selectedItem, setSelectedItem] = useState('');
  const [customItem, setCustomItem] = useState('');

  // 기존 배송 옵션 상태
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [needsCarrier, setNeedsCarrier] = useState(false);
  const [deliveryRoute, setDeliveryRoute] = useState('');
  const [specialOption, setSpecialOption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // 기존 상품 상세 정보 상태
  const [productDetails, setProductDetails] = useState({
    productNumber: '',
    orderNumber: '',
    ticketNumber: '',
    register: '',
    requestNotes: ''
  });
  const [noProductNumber, setNoProductNumber] = useState(false);

  // 🆕 주소 변환 상태 추가
  const [originAddressData, setOriginAddressData] = useState(null);
  const [destinationAddressData, setDestinationAddressData] = useState(null);

  // 🆕 API 관련 상태 추가
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 기존 OCR 관련 상태
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // API 기본 URL 설정
  const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://quinors-lv-backend.ngrok.io/api'
    : 'https://quinors-lv-backend.ngrok.io/api';

  // 기존 옵션들
  const itemOptions = [
    { id: 'bag', label: '쇼핑백', icon: 'fa-shopping-bag' },
    { id: 'clothes', label: '옷,유니폼', icon: 'fa-shirt' },
    { id: 'etc', label: '기타', icon: 'fa-box' }
  ];

  const deliveryMethods = [
    { id: 'motorcycle', label: '오토바이', icon: 'fa-motorcycle', weight: '최대 5kg' },
    { id: 'damas', label: '다마스', icon: 'fa-truck', weight: '최대 350kg' }
  ];

  const routeOptions = [
    { id: 'oneway', label: '편도', icon: 'fa-arrow-right' },
    { id: 'roundtrip', label: '왕복', icon: 'fa-arrows-left-right' }
  ];

  const specialOptions = [
    { id: 'none', label: '없음', icon: 'fa-check' },
    { id: 'express', label: '급송', icon: 'fa-bolt' },
    { id: 'scheduled', label: '예약', icon: 'fa-calendar' }
  ];

  // 🆕 API 매핑 함수들
  const mapItemToApiFormat = (item) => {
    const itemMapping = {
      'bag': '2',        // 소박스
      'clothes': '1',    // 서류봉투  
      'etc': '3'         // 중박스
    };
    return itemMapping[item] || '2';
  };

  const mapDeliveryMethodToApiFormat = (method) => {
    const methodMapping = {
      'motorcycle': '1', // 오토바이
      'damas': '2'       // 다마스
    };
    return methodMapping[method] || '1';
  };

  const mapRouteToApiFormat = (route) => {
    const routeMapping = {
      'oneway': '1',     // 편도
      'roundtrip': '3'   // 왕복
    };
    return routeMapping[route] || '1';
  };

  const mapSpecialOptionToApiFormat = (option) => {
    const optionMapping = {
      'none': '1',       // 일반
      'express': '3',    // 급송
      'scheduled': '1'   // 예약은 일반으로 (예약 시간은 별도 처리)
    };
    return optionMapping[option] || '1';
  };

  // 🆕 메모 자동 생성 함수
  const generateMemo = () => {
    const memoItems = [];
    
    if (productDetails.productNumber && !noProductNumber) {
      memoItems.push(`제품번호: ${productDetails.productNumber}`);
    }
    if (productDetails.orderNumber) {
      memoItems.push(`오더번호: ${productDetails.orderNumber}`);
    }
    if (productDetails.ticketNumber) {
      memoItems.push(`티켓번호: ${productDetails.ticketNumber}`);
    }
    if (productDetails.register) {
      memoItems.push(`레지스터: ${productDetails.register}`);
    }
    if (productDetails.requestNotes) {
      memoItems.push(`요청사항: ${productDetails.requestNotes}`);
    }

    return memoItems.join('\n');
  };

  // 🆕 픽업 날짜/시간 포맷팅 함수 (24시간 형식으로 수정)
  const formatPickupDateTime = () => {
  let targetDate;
  
  if (specialOption === 'scheduled' && scheduleDate && scheduleTime) {
    // 사용자가 설정한 예약 날짜/시간 사용
    const [year, month, day] = scheduleDate.split('-');
    const [hour, minute] = scheduleTime.split(':');
    
    targetDate = new Date(year, month - 1, day, hour, minute, 0); // 초는 0으로 설정
  } else {
    // 기본값: 현재 시간 + 1시간
    targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 1);
    targetDate.setSeconds(0); // 초는 0으로 설정
  }

  // 🎯 14자리 형식으로 포맷팅: YYYYMMDDHHMMSS (년월일시분초)
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hour = String(targetDate.getHours()).padStart(2, '0'); // 24시간 형식
  const minute = String(targetDate.getMinutes()).padStart(2, '0');
  const second = String(targetDate.getSeconds()).padStart(2, '0');

  const pickup_date = `${year}${month}${day}${hour}${minute}${second}`;

  console.log('📅 픽업 날짜/시간 포맷팅 (14자리):', {
    targetDate: targetDate.toISOString(),
    pickup_date, // 예: 20250902235900 (2025년 09월 02일 23시 59분 00초)
    pick_hour: hour,
    pick_min: minute,
    pick_sec: second
  });

  return {
    pickup_date,
    pick_hour: hour,
    pick_min: minute,
    pick_sec: second
  };
};

  // 🆕 주소 변환 API 호출 함수
  const convertAddress = async (address) => {
    try {
      console.log('🔄 주소 변환 시작:', address);
      
      const response = await fetch(`${API_BASE_URL}/address/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ 주소 변환 완료:', result.data);
        return result.data;
      } else {
        console.warn('⚠️ 주소 변환 실패:', result.message);
        return null;
      }
    } catch (error) {
      console.error('❌ 주소 변환 오류:', error);
      return null;
    }
  };

  // 🆕 배송 접수 API 호출 함수 (수정됨)
  const handleDeliverySubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // 필수 데이터 검증
      if (!originStore || !destinationStore) {
        throw new Error('출발지와 도착지를 선택해주세요.');
      }

      if (!selectedItem) {
        throw new Error('물품 종류를 선택해주세요.');
      }

      if (!deliveryMethod) {
        throw new Error('배송 수단을 선택해주세요.');
      }

      if (!deliveryRoute) {
        throw new Error('배송 경로를 선택해주세요.');
      }

      if (!specialOption) {
        throw new Error('특수 옵션을 선택해주세요.');
      }

      // 예약 옵션 선택 시 날짜/시간 검증
      if (specialOption === 'scheduled') {
        if (!scheduleDate || !scheduleTime) {
          throw new Error('예약 날짜와 시간을 선택해주세요.');
        }
      }

      console.log('🚚 배송 접수 시작');

      // 🆕 주소 변환 수행
      let originConverted = originAddressData;
      let destinationConverted = destinationAddressData;

      if (!originConverted && originStore.address) {
        originConverted = await convertAddress(originStore.address);
        setOriginAddressData(originConverted);
      }

      if (!destinationConverted && destinationStore.address) {
        destinationConverted = await convertAddress(destinationStore.address);
        setDestinationAddressData(destinationConverted);
      }

      // 픽업 날짜/시간 정보
      const pickupInfo = formatPickupDateTime();

      // 🎯 배송 상세 정보 구성
      const deliveryDetails = {
        kind: mapDeliveryMethodToApiFormat(deliveryMethod),
        item_type: mapItemToApiFormat(selectedItem),
        doc: mapRouteToApiFormat(deliveryRoute),
        sfast: mapSpecialOptionToApiFormat(specialOption),
        pay_gbn: '1', // 선불 (기본값)
        ...pickupInfo,
        memo: generateMemo(),
        reason_desc: '매장간 배송',
        order_memo: 'APP주문'
      };

      // 🎯 API 요청 데이터 구성
      const requestData = {
        deliveryType: deliveryType,
        originStore: originStore,
        destinationStore: destinationStore,
        originConvertedAddress: originConverted,
        destinationConvertedAddress: destinationConverted,
        deliveryDetails: deliveryDetails
      };

      console.log('📋 API 요청 데이터:', requestData);

      // API 호출
      const response = await fetch(`${API_BASE_URL}/delivery/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ 배송 접수 성공:', result);
        setSubmitSuccess(true);
        
        // 성공 알림
        alert('배송 접수가 완료되었습니다!');
        
      } else {
        throw new Error(result.message || '배송 접수에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 배송 접수 실패:', error);
      setSubmitError(error.message);
      alert(`배송 접수 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 기존 카메라 스트림 정리 함수
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // 기존 스트림 할당 함수
  useEffect(() => {
    if (stream && videoRef.current && showCameraModal) {
      console.log('useEffect에서 비디오 스트림 할당 시작');
      const video = videoRef.current;
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      const timer = setTimeout(() => {
        setVideoReady(true);
        console.log('비디오 준비 완료');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [stream, showCameraModal]);

  // 기존 카메라 시작 함수
  const startCamera = async () => {
    try {
      console.log('카메라 시작 요청');
      setCameraError('');
      setVideoReady(false);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      console.log('getUserMedia 호출 중...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('getUserMedia 성공:', mediaStream);

      setStream(mediaStream);
      console.log('스트림 상태 업데이트 완료');

    } catch (error) {
      console.error('카메라 접근 실패:', error);
      let errorMessage = '카메라에 접근할 수 없습니다.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다.';
      }
      
      setCameraError(errorMessage);
    }
  };

  // 기존 카메라 중지 함수
  const stopCamera = () => {
    console.log('카메라 중지');
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('트랙 중지:', track.kind);
        track.stop();
      });
      setStream(null);
    }
    setVideoReady(false);
    setCameraError('');
  };

  // 기존 이미지 캡처 함수
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('비디오 또는 캔버스 요소가 없습니다');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        console.log('이미지 캡처 성공, OCR 처리 시작');
        processOCR(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  // 기존 OCR 처리 함수
  const processOCR = async (imageBlob) => {
    setIsProcessing(true);
    setShowCameraModal(false);
    stopCamera();

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');

      const response = await fetch(`${API_BASE_URL}/ocr/process`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('OCR 처리 성공:', result.data);
        setOcrResults(result.data || []);
        setShowResultModal(true);
      } else {
        throw new Error(result.message || 'OCR 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('OCR 처리 실패:', error);
      alert(`OCR 처리 실패: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 기존 텍스트 할당 함수
  const assignTextToField = (text, field) => {
    setProductDetails(prev => ({
      ...prev,
      [field]: text
    }));

    setOcrResults(prev => prev.filter(item => item !== text));
  };

  // 기존 모달 관리 함수들
  const openCameraModal = () => {
    setShowCameraModal(true);
    startCamera();
  };

  const closeCameraModal = () => {
    setShowCameraModal(false);
    stopCamera();
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setOcrResults([]);
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
        
        <Header 
          title="배송 정보"
          subtitle="배송 정보를 입력해주세요"
          currentStep={4}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto pb-32">
          
          {/* 물품 정보 선택 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-box text-orange-500"></i>
              물품 정보
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {itemOptions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    selectedItem === item.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                  }`}
                >
                  <i className={`${item.icon} text-2xl mb-2`}></i>
                  <p className="text-xs font-medium">{item.label}</p>
                </button>
              ))}
            </div>

            {selectedItem === 'etc' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기타 물품 상세
                </label>
                <input
                  type="text"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="물품 상세 내용을 입력하세요"
                />
              </div>
            )}
          </div>

          {/* 배송 수단 선택 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-truck text-orange-500"></i>
              배송 수단
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {deliveryMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setDeliveryMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    deliveryMethod === method.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                  }`}
                >
                  <i className={`${method.icon} text-2xl mb-2`}></i>
                  <p className="font-medium text-sm">{method.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{method.weight}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 배송 경로 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-route text-orange-500"></i>
              배송 경로
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {routeOptions.map((route) => (
                <button
                  key={route.id}
                  onClick={() => setDeliveryRoute(route.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    deliveryRoute === route.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                  }`}
                >
                  <i className={`${route.icon} text-2xl mb-2`}></i>
                  <p className="font-medium text-sm">{route.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 특수 옵션 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-star text-orange-500"></i>
              특수 옵션
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              {specialOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSpecialOption(option.id)}
                  className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    specialOption === option.id
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
                  }`}
                >
                  <i className={`${option.icon} text-xl mb-2`}></i>
                  <p className="text-xs font-medium">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 예약 날짜/시간 (specialOption이 'scheduled'일 때만 표시) */}
          {specialOption === 'scheduled' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-calendar-alt text-orange-500"></i>
                예약 일시
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">시간</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 상품 상세 정보 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-clipboard-list text-orange-500"></i>
              상품 상세 정보
            </h3>
            
            {/* OCR 버튼 */}
            <div className="mb-4">
              <button
                onClick={openCameraModal}
                className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-camera text-xl"></i>
                카메라로 텍스트 인식
              </button>
            </div>

            {/* 제품번호 필드 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  제품번호
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="noProductNumber"
                    checked={noProductNumber}
                    onChange={(e) => {
                      setNoProductNumber(e.target.checked);
                      if (e.target.checked) {
                        setProductDetails(prev => ({ ...prev, productNumber: '' }));
                      }
                    }}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="noProductNumber" className="text-xs text-gray-600">
                    제품번호 없음
                  </label>
                </div>
              </div>
              <input
                type="text"
                value={productDetails.productNumber}
                onChange={(e) => setProductDetails(prev => ({ ...prev, productNumber: e.target.value }))}
                disabled={noProductNumber}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="제품번호를 입력하세요"
              />
            </div>

            {/* 오더번호 필드 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                오더번호
              </label>
              <input
                type="text"
                value={productDetails.orderNumber}
                onChange={(e) => setProductDetails(prev => ({ ...prev, orderNumber: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="오더번호를 입력하세요"
              />
            </div>

            {/* 티켓번호 필드 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                티켓번호
              </label>
              <input
                type="text"
                value={productDetails.ticketNumber}
                onChange={(e) => setProductDetails(prev => ({ ...prev, ticketNumber: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="티켓번호를 입력하세요"
              />
            </div>

            {/* 레지스터 필드 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                레지스터
              </label>
              <input
                type="text"
                value={productDetails.register}
                onChange={(e) => setProductDetails(prev => ({ ...prev, register: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="레지스터를 입력하세요"
              />
            </div>

            {/* 요청사항 필드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요청사항
              </label>
              <textarea
                value={productDetails.requestNotes}
                onChange={(e) => setProductDetails(prev => ({ ...prev, requestNotes: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="추가 요청사항을 입력하세요"
                rows="3"
              />
            </div>
          </div>

        </main>

        <FloatingPreview 
          content={`${deliveryType} - ${selectedItem ? itemOptions.find(i => i.id === selectedItem)?.label : ''}`}
          onEdit={() => {}}
          show={true}
        />

        {/* 하단 버튼 */}
        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button 
            onClick={handleDeliverySubmit}
            disabled={isSubmitting || !selectedItem || !deliveryMethod || !deliveryRoute || !specialOption}
            className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                접수 중...
              </>
            ) : (
              '배송 요청하기'
            )}
          </Button>
          
          {/* 에러 메시지 표시 */}
          {submitError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          )}
          
          {/* 성공 메시지 표시 */}
          {submitSuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">배송 접수가 완료되었습니다!</p>
            </div>
          )}
        </footer>

        {/* 기존 모달들... (카메라 모달, OCR 결과 모달, 처리 중 오버레이) */}
        {/* 카메라 모달 */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md h-auto max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">텍스트 인식</h3>
                <button
                  onClick={closeCameraModal}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <i className="fa-solid fa-times text-gray-600"></i>
                </button>
              </div>

              <div className="flex-1 p-6 flex flex-col">
                {cameraError ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <i className="fa-solid fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                      <p className="text-red-600 mb-4">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        다시 시도
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ display: videoReady ? 'block' : 'none' }}
                      />
                      {!videoReady && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <button
                      onClick={captureImage}
                      disabled={!videoReady}
                      className="w-full p-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-camera text-xl"></i>
                      촬영하기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OCR 결과 모달 */}
        {showResultModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md h-auto max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">인식된 텍스트</h3>
                <button
                  onClick={closeResultModal}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>

              <div className="mb-4 px-6">
                <p className="text-sm text-gray-600">텍스트를 클릭하여 원하는 필드에 입력하세요</p>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 space-y-2 px-6">
                {ocrResults.map((text, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-800 mb-2 font-mono break-all">{text}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => assignTextToField(text, 'productNumber')}
                        disabled={noProductNumber}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        제품번호
                      </button>
                      <button
                        onClick={() => assignTextToField(text, 'orderNumber')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                      >
                        오더번호
                      </button>
                      <button
                        onClick={() => assignTextToField(text, 'ticketNumber')}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                      >
                        티켓번호
                      </button>
                      <button
                        onClick={() => assignTextToField(text, 'register')}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition-colors"
                      >
                        레지스터
                      </button>
                    </div>
                  </div>
                ))}
                {ocrResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">모든 텍스트가 할당되었습니다</p>
                  </div>
                )}
              </div>

              <div className="p-6">
                <button
                  onClick={closeResultModal}
                  className="w-full bg-gray-500 text-white py-3 rounded-xl font-medium hover:bg-gray-600 transition-colors"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 처리 중 오버레이 */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">텍스트 인식 중...</p>
              <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DeliveryInfoForm;