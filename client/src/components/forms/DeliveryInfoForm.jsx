import React, { useState, useRef, useEffect } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';

const DeliveryInfoForm = () => {
  const { deliveryType, originStore, destinationStore, dispatch } = useDelivery();

  // 물품 정보 상태
  const [selectedItem, setSelectedItem] = useState('');
  const [customItem, setCustomItem] = useState('');

  // 배송 옵션 상태
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [needsCarrier, setNeedsCarrier] = useState(false);
  const [deliveryRoute, setDeliveryRoute] = useState('');
  const [specialOption, setSpecialOption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // 상품 상세 정보 상태
  const [productDetails, setProductDetails] = useState({
    productNumber: '',
    orderNumber: '',
    ticketNumber: '',
    register: '',
    requestNotes: ''
  });
  const [noProductNumber, setNoProductNumber] = useState(false);

  // OCR 관련 상태
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

  // 카메라 스트림 정리 함수
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // 스트림이 변경될 때마다 비디오 엘리먼트에 할당
  useEffect(() => {
    if (stream && videoRef.current && showCameraModal) {
      console.log('useEffect에서 비디오 스트림 할당 시작');
      
      const video = videoRef.current;
      video.srcObject = stream;
      
      // 비디오 속성 명시적 설정
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      
      console.log('비디오 엘리먼트 설정 완료:', {
        srcObject: video.srcObject,
        autoplay: video.autoplay,
        playsInline: video.playsInline,
        muted: video.muted
      });

      // 짧은 지연 후 준비 완료 처리
      const timer = setTimeout(() => {
        console.log('타이머로 비디오 준비 완료 처리');
        setVideoReady(true);
      }, 1500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [stream, showCameraModal]);

  // 기존 핸들러들
  const handleItemSelect = (itemId) => {
    setSelectedItem(itemId);
    if (itemId !== 'etc') {
      setCustomItem('');
    }
  };

  const handleDeliveryMethodSelect = (methodId) => {
    setDeliveryMethod(methodId);
    if (methodId !== 'motorcycle') {
      setNeedsCarrier(false);
    }
  };

  const handleSpecialOptionSelect = (optionId) => {
    setSpecialOption(optionId);
    if (optionId !== 'scheduled') {
      setScheduleDate('');
      setScheduleTime('');
    }
  };

  const handleProductDetailsChange = (field, value) => {
    setProductDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNoProductNumberChange = (checked) => {
    setNoProductNumber(checked);
    if (checked) {
      setProductDetails(prev => ({ ...prev, productNumber: '' }));
    }
  };

  // OCR 관련 핸들러들
  const startCamera = async () => {
    try {
      setCameraError('');
      setVideoReady(false);
      
      // HTTPS 체크
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setCameraError('카메라 기능은 HTTPS 환경에서만 사용할 수 있습니다.');
        return;
      }

      console.log('카메라 시작 중...');
      
      const constraints = [
        {
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        {
          video: { 
            facingMode: 'user',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        },
        {
          video: true
        }
      ];

      let mediaStream = null;
      let lastError = null;

      for (const constraint of constraints) {
        try {
          console.log('카메라 제약조건 시도:', constraint);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('카메라 스트림 획득 성공:', mediaStream);
          break;
        } catch (error) {
          console.log('카메라 제약조건 실패:', error);
          lastError = error;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('카메라에 접근할 수 없습니다.');
      }
      
      // 모달을 먼저 열고
      setShowCameraModal(true);
      
      // 약간의 지연 후 스트림 설정 (DOM 렌더링 대기)
      setTimeout(() => {
        console.log('스트림 설정 중...');
        setStream(mediaStream);
      }, 100);
      
    } catch (error) {
      console.error('카메라 접근 오류:', error);
      let errorMessage = '카메라에 접근할 수 없습니다.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const stopCamera = () => {
    console.log('카메라 정지 중...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('트랙 정지:', track.kind);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
    setVideoReady(false);
    setCameraError('');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) {
      setCameraError('카메라가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // 비디오 크기 확인
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setCameraError('비디오 스트림이 준비되지 않았습니다.');
        return;
      }

      // 원본 해상도 사용
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('캔버스 크기:', canvas.width, 'x', canvas.height);
      
      // 원본 이미지 그대로 캡처
      context.drawImage(video, 0, 0);

      // JPEG 포맷으로 적당한 품질로 저장
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('이미지 캡처 성공:', blob.size, 'bytes');
          processOCR(blob);
        } else {
          setCameraError('이미지 캡처에 실패했습니다.');
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('이미지 캡처 오류:', error);
      setCameraError('이미지 캡처 중 오류가 발생했습니다.');
    }
  };

  const processOCR = async (imageBlob) => {
    setIsProcessing(true);
    stopCamera();

    try {
      console.log('Google Cloud Vision OCR 처리 시작...');
      
      // 이미지를 Base64로 변환
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      console.log('이미지 Base64 변환 완료, 크기:', Math.round(base64Image.length / 1024), 'KB');

      // 백엔드 API 호출
      const response = await fetch(`${API_BASE_URL}/ocr/google-vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API 호출 실패 (${response.status})`);
      }

      const result = await response.json();
      console.log('Google Vision OCR 결과:', result);

      if (!result.success || !result.texts || result.texts.length === 0) {
        setCameraError('텍스트를 인식할 수 없습니다.\n\n다음을 확인해주세요:\n• 조명이 충분히 밝은지\n• 텍스트가 선명하고 흔들리지 않았는지\n• 카메라와 텍스트가 적절한 거리에 있는지');
        setIsProcessing(false);
        return;
      }

      console.log('추출된 텍스트들:', result.texts);
      console.log('전체 텍스트:', result.fullText);
      console.log('신뢰도:', result.confidence);

      // 결과 정리
      const cleanedTexts = result.texts
        .filter(text => text.trim().length > 0)
        .slice(0, 15);

      if (cleanedTexts.length === 0) {
        setCameraError('유효한 텍스트를 찾을 수 없습니다. 텍스트가 더 선명하게 보이도록 다시 촬영해주세요.');
        setIsProcessing(false);
        return;
      }

      setOcrResults(cleanedTexts);
      setShowResultModal(true);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Google Vision OCR 처리 오류:', error);
      setCameraError(`텍스트 인식 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n서버 연결을 확인하고 다시 시도해주세요.`);
      setIsProcessing(false);
    }
  };

  const assignTextToField = (text, field) => {
    handleProductDetailsChange(field, text);
    setOcrResults(prev => prev.filter(item => item !== text));
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setOcrResults([]);
  };

  // 기존 핸들러들
  const handleSubmit = () => {
    const deliveryInfo = {
      item: selectedItem === 'etc' ? customItem : selectedItem,
      deliveryMethod,
      needsCarrier,
      deliveryRoute,
      specialOption,
      scheduleDate,
      scheduleTime,
      productDetails: {
        ...productDetails,
        noProductNumber
      }
    };

    console.log('배송 요청:', {
      deliveryType,
      originStore,
      destinationStore,
      deliveryInfo
    });

    alert('배송 요청이 완료되었습니다!');
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 3 });
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const getPreviewContent = () => {
    if (originStore && destinationStore) {
      return `${deliveryType} • ${originStore.name} → ${destinationStore.name}`;
    }
    return deliveryType || '배송 정보';
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
        <Header
          title="배송 정보 입력"
          subtitle="물품 정보와 배송 옵션을 선택해주세요"
          currentStep={4}
          onBack={handleBack}
          onClose={handleClose}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto pb-20">
          {/* 물품 정보 섹션 */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">물품 정보</h3>
            <div className="grid grid-cols-3 gap-3">
              {itemOptions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                    selectedItem === item.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-500'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-2xl text-gray-600 mb-2`}></i>
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  {item.id === 'etc' && selectedItem === 'etc' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customItem}
                        onChange={(e) => setCustomItem(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        placeholder="책 한권"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 배송 옵션 섹션 */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">배송 옵션</h3>
            <div className="space-y-4">
              {/* 배송 수단 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">배송 수단</h4>
                <div className="space-y-3">
                  {deliveryMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                        deliveryMethod === method.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                      onClick={() => handleDeliveryMethodSelect(method.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <i className={`fa-solid ${method.icon} text-xl text-orange-500`}></i>
                          <div>
                            <span className="font-medium text-gray-800">{method.label}</span>
                            <p className="text-xs text-gray-500">{method.weight}</p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="delivery-method"
                          checked={deliveryMethod === method.id}
                          onChange={() => handleDeliveryMethodSelect(method.id)}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      {method.id === 'motorcycle' && deliveryMethod === 'motorcycle' && (
                        <div className="ml-8">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={needsCarrier}
                              onChange={(e) => setNeedsCarrier(e.target.checked)}
                              className="text-orange-500 focus:ring-orange-500 rounded"
                            />
                            <div>
                              <span className="text-sm text-gray-600">짐받이 필요</span>
                              <p className="text-xs text-gray-400">최대 15kg</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 배송 경로 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">배송 경로</h4>
                <div className="grid grid-cols-2 gap-3">
                  {routeOptions.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setDeliveryRoute(route.id)}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                        deliveryRoute === route.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                    >
                      <i className={`fa-solid ${route.icon} text-xl text-gray-600 mb-2`}></i>
                      <p className="text-sm font-medium text-gray-700">{route.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기타 옵션 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">기타 옵션</h4>
                <div className="grid grid-cols-3 gap-3">
                  {specialOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleSpecialOptionSelect(option.id)}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                        specialOption === option.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                    >
                      <i className={`fa-solid ${option.icon} text-xl text-gray-600 mb-2`}></i>
                      <p className="text-sm font-medium text-gray-700">{option.label}</p>
                    </div>
                  ))}
                </div>

                {/* 예약 일시 선택 */}
                {specialOption === 'scheduled' && (
                  <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">예약 일시 선택</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">날짜</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">시간</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 상품 상세 정보 섹션 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">제품 상세 정보</h3>
              <button
                onClick={startCamera}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-camera text-sm"></i>
                {isProcessing ? '처리 중...' : '촬영으로 기입'}
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
              {/* 제품번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제품번호</label>
                <input
                  type="text"
                  value={productDetails.productNumber}
                  onChange={(e) => handleProductDetailsChange('productNumber', e.target.value)}
                  disabled={noProductNumber}
                  className={`w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                    noProductNumber ? 'bg-gray-100' : ''
                  }`}
                  placeholder="제품번호를 입력하세요"
                />
                <label className="flex items-center mt-2 gap-2">
                  <input
                    type="checkbox"
                    checked={noProductNumber}
                    onChange={(e) => handleNoProductNumberChange(e.target.checked)}
                    className="text-orange-500 focus:ring-orange-500 rounded"
                  />
                  <span className="text-xs text-gray-600">제품번호 없음</span>
                </label>
              </div>

              {/* 오더번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">오더번호</label>
                <input
                  type="text"
                  value={productDetails.orderNumber}
                  onChange={(e) => handleProductDetailsChange('orderNumber', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="오더번호를 입력하세요"
                />
              </div>

              {/* 티켓번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">티켓번호</label>
                <input
                  type="text"
                  value={productDetails.ticketNumber}
                  onChange={(e) => handleProductDetailsChange('ticketNumber', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="티켓번호를 입력하세요"
                />
              </div>

              {/* 레지스터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">레지스터</label>
                <input
                  type="text"
                  value={productDetails.register}
                  onChange={(e) => handleProductDetailsChange('register', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="레지스터를 입력하세요"
                />
              </div>

              {/* 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  요청사항
                  {noProductNumber && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={productDetails.requestNotes}
                  onChange={(e) => handleProductDetailsChange('requestNotes', e.target.value)}
                  required={noProductNumber}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 h-20 resize-none"
                  placeholder="요청사항을 입력하세요"
                />
              </div>
            </div>

            {/* 에러 메시지 */}
            {cameraError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-exclamation-triangle text-red-500 text-sm mt-0.5"></i>
                  <div>
                    <p className="text-red-600 text-sm font-medium mb-1">텍스트 인식 오류</p>
                    <pre className="text-red-600 text-xs whitespace-pre-wrap">{cameraError}</pre>
                    <button
                      onClick={() => setCameraError('')}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 개발용 정보 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium mb-2">개발자 정보</p>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• Google Vision API 사용 중</p>
                  <p>• 서버: {API_BASE_URL}</p>
                  <p>• 브라우저 콘솔에서 상세 로그 확인</p>
                </div>
              </div>
            )}
          </section>
        </main>

        <FloatingPreview
          content={getPreviewContent()}
          onEdit={() => dispatch({ type: 'SET_STEP', payload: 1 })}
          show={true}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleSubmit}>
            배송 요청하기
          </Button>
        </footer>
      </div>

      {/* 카메라 모달 */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">텍스트 촬영</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl bg-gray-900"
                style={{ aspectRatio: '4/3' }}
                onLoadedMetadata={() => {
                  console.log('비디오 메타데이터 로드됨');
                  setVideoReady(true);
                }}
                onCanPlay={() => {
                  console.log('비디오 재생 가능');
                  setVideoReady(true);
                }}
                onError={(e) => {
                  console.error('비디오 에러:', e);
                  setCameraError('비디오 재생 중 오류가 발생했습니다.');
                }}
              />
              <div className="absolute inset-4 border-2 border-orange-500 border-dashed rounded-lg pointer-events-none"></div>
              
              {/* 카메라 상태 표시 */}
              {!videoReady && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-xl">
                  <div className="text-center text-white">
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">카메라 준비 중...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-2">텍스트가 테두리 안에 오도록 조정하세요</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 조명이 밝은 곳에서 촬영하세요</p>
                <p>• 텍스트를 화면 가득 채우세요</p>
                <p>• 카메라를 흔들지 말고 고정하세요</p>
                <p>• 텍스트가 수평이 되도록 하세요</p>
              </div>
              {videoReady && (
                <p className="text-xs text-green-600 mt-2 font-medium">카메라 준비 완료</p>
              )}
            </div>
            
            <button
              onClick={captureImage}
              disabled={!videoReady}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {videoReady ? '촬영하기' : '카메라 준비 중...'}
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* OCR 결과 모달 */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">인식된 텍스트</h3>
              <button
                onClick={closeResultModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">텍스트를 클릭하여 원하는 필드에 입력하세요</p>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
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
            
            <button
              onClick={closeResultModal}
              className="w-full bg-gray-500 text-white py-3 rounded-xl font-medium hover:bg-gray-600 transition-colors"
            >
              완료
            </button>
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
  );
};

export default DeliveryInfoForm;