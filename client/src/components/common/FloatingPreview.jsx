import React, { useState, useEffect } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import AddressConverter from './AddressConverter';

const FloatingPreview = ({ content, onEdit, show = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deliveryType, originStore, destinationStore, currentStep } = useDelivery();
  const { user, requesterInfo, updateUserInfo, token } = useAuth();
  
  // 주소 변환 결과 저장
  const [originConvertedAddress, setOriginConvertedAddress] = useState(null);
  const [destinationConvertedAddress, setDestinationConvertedAddress] = useState(null);
  
  // 사용자 상세 정보 상태
  const [userDetails, setUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(true);

  // 사용자 상세 정보 가져오기 함수
  const fetchUserDetails = async () => {
    if (!user || !token) {
      setLoadingUserDetails(false);
      return;
    }
    
    try {
      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/auth/stores/user/${user.user_id || user.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          setUserDetails(result.data);
          
          // AuthContext의 사용자 정보도 업데이트
          if (updateUserInfo && result.data.tel_no && (!user.tel_no || user.tel_no !== result.data.tel_no)) {
            updateUserInfo();
          }
        } else {
          setUserDetails(user);
        }
      } else {
        setUserDetails(user);
      }
    } catch (error) {
      setUserDetails(user);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // 사용자 정보 변경 시 상세 정보 조회
  useEffect(() => {
    if (user && token) {
      fetchUserDetails();
    }
  }, [user?.user_id, token]);

  if (!show) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber === '' || phoneNumber === '연락처 없음' || phoneNumber === 'undefined') {
      return '연락처 없음';
    }
    
    // 문자열로 변환 후 숫자만 추출
    const phoneStr = String(phoneNumber);
    const numbers = phoneStr.replace(/[^0-9]/g, '');
    
    // 11자리 휴대폰 번호 포맷팅
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    // 10자리 전화번호 포맷팅  
    else if (numbers.length === 10) {
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    
    return phoneStr; // 원본 반환
  };

  // 매장 정보 포맷팅 함수
  const formatStoreInfo = (store) => {
    if (!store) return null;

    let managerInfo = {
      name: '담당자 없음',
      phone: '연락처 없음',
      department: null
    };

    // selectedManagerInfo가 있는 경우
    if (store.selectedManagerInfo) {
      managerInfo = {
        name: store.selectedManagerInfo.name || '담당자 없음',
        phone: store.selectedManagerInfo.phone || '연락처 없음',
        department: store.selectedManagerInfo.department || null
      };
    }
    // departments 배열에서 선택된 부서 담당자 정보 찾기
    else if (store.departments && store.departments.length > 0) {
      let selectedDepartment = null;

      if (store.selectedDepartment) {
        selectedDepartment = store.departments.find(dept =>
          dept.department === store.selectedDepartment
        );
      } else if (store.selectedDepartmentIndex !== undefined) {
        selectedDepartment = store.departments[store.selectedDepartmentIndex];
      } else if (store.departmentId) {
        selectedDepartment = store.departments.find(dept =>
          dept._id && dept._id.toString() === store.departmentId
        );
      }

      if (!selectedDepartment) {
        selectedDepartment = store.departments[0];
      }

      if (selectedDepartment) {
        managerInfo = {
          name: selectedDepartment.managerName || '담당자 없음',
          phone: selectedDepartment.fullPhone || selectedDepartment.managerPhone || '연락처 없음',
          department: selectedDepartment.department || ''
        };
      }
    }
    // 기존 방식 지원
    else if (store.managerName || store.fullPhone) {
      managerInfo = {
        name: store.managerName || '담당자 없음',
        phone: store.fullPhone || store.phone || store.phoneNumber || '연락처 없음'
      };
    }

    const info = {
      name: store.name || store.storeName || '매장명 없음',
      address: store.address || '주소 없음',
      manager: managerInfo.name,
      phone: managerInfo.phone,
      department: managerInfo.department || null
    };

    return info;
  };

  // 주소 변환 콜백 함수들
  const handleOriginAddressConverted = (convertedData) => {
    setOriginConvertedAddress(convertedData);
  };

  const handleDestinationAddressConverted = (convertedData) => {
    setDestinationConvertedAddress(convertedData);
  };

  // 표시할 사용자 정보 계산 함수
  const getDisplayUserInfo = () => {
    // userDetails (API에서 가져온 최신 정보) > requesterInfo > user 순서로 우선순위
    const currentUser = userDetails || user;
    const currentRequesterInfo = requesterInfo;
    
    if (!currentUser && !currentRequesterInfo) {
      return { custName: '상호명 없음', deptName: '부서명 없음', chargeName: '담당자명 없음', telNo: '연락처 없음' };
    }

    // 각 필드별로 최적의 값 선택
    const displayInfo = {
      custName: userDetails?.cust_name || currentRequesterInfo?.custName || user?.cust_name || '상호명 없음',
      deptName: userDetails?.dept_name || currentRequesterInfo?.deptName || user?.dept_name || '부서명 없음',
      chargeName: userDetails?.charge_name || currentRequesterInfo?.chargeName || user?.charge_name || '담당자명 없음',
      // tel_no는 userDetails를 최우선으로 사용
      telNo: userDetails?.tel_no || user?.tel_no || currentRequesterInfo?.telNo || '연락처 없음'
    };

    return displayInfo;
  };

  // 단계별 정보 구성
  const getStepInfo = () => {
    const steps = [];

    // 0단계: 의뢰자 정보
    const displayUserInfo = getDisplayUserInfo();
    
    if (displayUserInfo && (displayUserInfo.custName !== '상호명 없음' || user || requesterInfo)) {
      steps.push({
        step: 0,
        title: '의뢰자 정보',
        content: (
          <div className="text-left">
            <div className="font-medium text-gray-800">
              {displayUserInfo.custName}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {/* 부서명 */}
              <div className="flex items-center gap-1">
                <i className="fa-solid fa-building text-purple-500"></i>
                <span>{displayUserInfo.deptName}</span>
              </div>
              
              {/* 담당자명 */}
              <div className="flex items-center gap-1 mt-1">
                <i className="fa-solid fa-user-tie text-orange-500"></i>
                <span>{displayUserInfo.chargeName}</span>
              </div>
              
              {/* 연락처 - 로딩 상태 고려 */}
              <div className="flex items-center gap-1 mt-1">
                <i className="fa-solid fa-phone text-green-500"></i>
                {loadingUserDetails ? (
                  <div className="animate-pulse bg-gray-200 h-3 w-20 rounded"></div>
                ) : (
                  <span>{formatPhoneNumber(displayUserInfo.telNo)}</span>
                )}
              </div>
            </div>
          </div>
        ),
        icon: 'fa-user-circle',
        completed: true
      });
    }

    // 1단계: 배송 유형
    if (deliveryType) {
      steps.push({
        step: 1,
        title: '배송 유형',
        content: deliveryType,
        icon: 'fa-truck',
        completed: true
      });
    }

    // 2단계: 출발지
    if (originStore) {
      const originInfo = formatStoreInfo(originStore);
      steps.push({
        step: 2,
        title: '출발지',
        content: originInfo ? (
          <div className="text-left">
            <div className="font-medium text-gray-800">{originInfo.name}</div>
            <div className="text-xs text-gray-600 mt-1">
              {/* 담당자 정보 */}
              <div className="flex items-center gap-1">
                <i className="fa-solid fa-user text-orange-500"></i>
                <span>{originInfo.manager}</span>
                {originInfo.department && (
                  <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                    {originInfo.department}
                  </span>
                )}
              </div>
              
              {/* 연락처 */}
              <div className="flex items-center gap-1 mt-1">
                <i className="fa-solid fa-phone text-green-500"></i>
                <span>{formatPhoneNumber(originInfo.phone)}</span>
              </div>
              
              {/* 주소 및 변환 */}
              <div className="mt-2 space-y-1">
                {/* 도로명주소 */}
                <div className="flex items-center gap-1">
                  <i className="fa-solid fa-map-marker-alt text-blue-500"></i>
                  <span className="line-clamp-2">{originInfo.address}</span>
                </div>
                
                {/* 지번주소 (카카오 API로 변환된 주소) */}
                <AddressConverter
                  originalAddress={originInfo.address}
                  onAddressConverted={handleOriginAddressConverted}
                  showOriginal={false}
                  className=""
                />
              </div>
            </div>
          </div>
        ) : '출발지 정보 없음',
        icon: 'fa-store',
        completed: true
      });
    }

    // 3단계: 도착지
    if (destinationStore) {
      const destinationInfo = formatStoreInfo(destinationStore);
      steps.push({
        step: 3,
        title: '도착지',
        content: destinationInfo ? (
          <div className="text-left">
            <div className="font-medium text-gray-800">{destinationInfo.name}</div>
            <div className="text-xs text-gray-600 mt-1">
              {/* 담당자 정보 */}
              <div className="flex items-center gap-1">
                <i className="fa-solid fa-user text-orange-500"></i>
                <span>{destinationInfo.manager}</span>
                {destinationInfo.department && (
                  <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                    {destinationInfo.department}
                  </span>
                )}
              </div>
              
              {/* 연락처 */}
              <div className="flex items-center gap-1 mt-1">
                <i className="fa-solid fa-phone text-green-500"></i>
                <span>{formatPhoneNumber(destinationInfo.phone)}</span>
              </div>
              
              {/* 주소 및 변환 */}
              <div className="mt-2 space-y-1">
                {/* 도로명주소 */}
                <div className="flex items-center gap-1">
                  <i className="fa-solid fa-map-marker-alt text-blue-500"></i>
                  <span className="line-clamp-2">{destinationInfo.address}</span>
                </div>
                
                {/* 지번주소 (카카오 API로 변환된 주소) */}
                <AddressConverter
                  originalAddress={destinationInfo.address}
                  onAddressConverted={handleDestinationAddressConverted}
                  showOriginal={false}
                  className=""
                />
              </div>
            </div>
          </div>
        ) : '도착지 정보 없음',
        icon: 'fa-flag-checkered',
        completed: true
      });
    }

    // 4단계: 배송 정보
    steps.push({
      step: 4,
      title: '배송 정보',
      content: currentStep >= 4 ? '입력 중...' : '미완료',
      icon: 'fa-clipboard-list',
      completed: currentStep > 4
    });

    return steps;
  };

  const stepInfo = getStepInfo();

  return (
    <>
      {/* 확장된 미리보기 패널 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-6 bg-gradient-to-r from-orange-400 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">선택 정보</h2>
              <button
                onClick={toggleExpanded}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <p className="text-orange-100 text-sm mt-1">배송 요청 진행 상황</p>
          </div>

          {/* 단계별 정보 */}
          <div className="flex-1 overflow-y-auto p-6">
            {stepInfo.map((step, index) => (
              <div key={`step-${step.step}`} className="relative">
                <div className={`flex items-start gap-4 pb-6 ${
                  step.completed ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  {/* 단계 아이콘 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    <i className={`fa-solid ${step.icon} text-sm`}></i>
                  </div>

                  {/* 단계 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-sm ${
                        step.completed ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {step.step === 0 ? '의뢰자' : `${step.step}단계`}. {step.title}
                      </h3>
                      {step.completed && (
                        <i className="fa-solid fa-check-circle text-green-500 text-xs"></i>
                      )}
                    </div>
                    <div className={`text-sm ${
                      step.completed ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {typeof step.content === 'string' ? step.content : step.content}
                    </div>
                  </div>
                </div>

                {/* 연결선 */}
                {index < stepInfo.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-8 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>

          {/* 진행률 표시 */}
          <div className="p-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 font-medium">전체 진행률</span>
                <span className="text-lg text-orange-600 font-bold">
                  {Math.round((stepInfo.filter(s => s.completed).length / stepInfo.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${(stepInfo.filter(s => s.completed).length / stepInfo.length) * 100}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                {stepInfo.filter(s => s.completed).length} / {stepInfo.length} 단계 완료
              </div>
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="space-y-3">
              <button
                onClick={onEdit}
                className="w-full bg-white border-2 border-orange-500 text-orange-500 py-3 px-4 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
              >
                <i className="fa-solid fa-edit mr-2"></i>
                처음부터 다시 선택
              </button>
              <button
                onClick={toggleExpanded}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <i className="fa-solid fa-check mr-2"></i>
                확인 완료
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 좌측 가장자리 탭 (항상 표시) */}
      <div className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ${
        isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button
          onClick={toggleExpanded}
          className="bg-gradient-to-r from-orange-400 to-orange-500 text-white p-3 rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <div className="flex flex-col items-center gap-1">
            <i className="fa-solid fa-chevron-right group-hover:translate-x-0.5 transition-transform"></i>
            <div className="writing-mode-vertical text-xs font-medium">
              선택정보
            </div>
            {stepInfo.filter(s => s.completed).length > 0 && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </div>
        </button>
      </div>
    </>
  );
};

export default FloatingPreview;