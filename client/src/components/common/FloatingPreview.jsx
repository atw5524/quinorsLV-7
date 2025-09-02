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
  
  // 🎯 사용자 상세 정보 상태 추가 (DeliveryTypeSelector와 동일)
  const [userDetails, setUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(true);

  // 🎯 사용자 상세 정보 가져오기 함수 (DeliveryTypeSelector와 동일)
  const fetchUserDetails = async () => {
    if (!user || !token) {
      setLoadingUserDetails(false);
      return;
    }
    
    try {
      console.log('👤 FloatingPreview - 사용자 상세 정보 조회 시작:', user.user_id || user.userId);
      
      // DeliveryTypeSelector에서 사용하는 것과 동일한 API 사용
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
          console.log('👤 FloatingPreview - ✅ 사용자 정보 조회 성공:', result.data);
          setUserDetails(result.data);
          
          // AuthContext의 사용자 정보도 업데이트
          if (updateUserInfo && result.data.tel_no && (!user.tel_no || user.tel_no !== result.data.tel_no)) {
            console.log('🔄 FloatingPreview - AuthContext 사용자 정보 업데이트');
            updateUserInfo();
          }
        } else {
          console.log('👤 FloatingPreview - 사용자 정보 조회 실패, 기존 정보 사용');
          setUserDetails(user);
        }
      } else {
        console.log('👤 FloatingPreview - API 응답 실패, 기존 정보 사용');
        setUserDetails(user);
      }
    } catch (error) {
      console.error('👤 FloatingPreview - ❌ 네트워크 오류:', error);
      setUserDetails(user);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // 🎯 사용자 정보 변경 시 상세 정보 조회 (DeliveryTypeSelector와 동일)
  useEffect(() => {
    if (user && token) {
      fetchUserDetails();
    }
  }, [user?.user_id, token]);

  if (!show) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 전화번호 포맷팅 함수 - 수정됨
  const formatPhoneNumber = (phoneNumber) => {
    console.log('📞 전화번호 포맷팅 입력:', phoneNumber, typeof phoneNumber);
    
    if (!phoneNumber || phoneNumber === '' || phoneNumber === '연락처 없음' || phoneNumber === 'undefined') {
      return '연락처 없음';
    }
    
    // 문자열로 변환 후 숫자만 추출
    const phoneStr = String(phoneNumber);
    const numbers = phoneStr.replace(/[^0-9]/g, '');
    
    console.log('📞 숫자만 추출:', numbers);
    
    // 11자리 휴대폰 번호 포맷팅
    if (numbers.length === 11) {
      const formatted = numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      console.log('📞 11자리 포맷팅 결과:', formatted);
      return formatted;
    }
    // 10자리 전화번호 포맷팅  
    else if (numbers.length === 10) {
      const formatted = numbers.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      console.log('📞 10자리 포맷팅 결과:', formatted);
      return formatted;
    }
    
    console.log('📞 포맷팅 안됨, 원본 반환:', phoneStr);
    return phoneStr; // 원본 반환
  };

  // 매장 정보 포맷팅 함수 - 개선된 버전
  const formatStoreInfo = (store) => {
    if (!store) return null;

    let managerInfo = {
      name: '담당자 없음',
      phone: '연락처 없음',
      department: null
    };

    // 🎯 1. selectedManagerInfo가 있는 경우 (새로운 방식 - 우선순위 높음)
    if (store.selectedManagerInfo) {
      console.log('✅ selectedManagerInfo 발견:', store.selectedManagerInfo);
      managerInfo = {
        name: store.selectedManagerInfo.name || '담당자 없음',
        phone: store.selectedManagerInfo.phone || '연락처 없음',
        department: store.selectedManagerInfo.department || null
      };
    }
    // 🎯 2. departments 배열에서 선택된 부서 담당자 정보 찾기
    else if (store.departments && store.departments.length > 0) {
      let selectedDepartment = null;

      // 선택된 부서 정보 확인 방법들
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

      // 선택된 부서가 없는 경우 디버깅
      if (!selectedDepartment) {
        console.warn('⚠️ 선택된 부서 정보를 찾을 수 없습니다:', {
          storeName: store.storeName || store.name,
          selectedDepartment: store.selectedDepartment,
          selectedDepartmentIndex: store.selectedDepartmentIndex,
          departmentId: store.departmentId,
          availableDepartments: store.departments.map(d => d.department)
        });
        selectedDepartment = store.departments[0];
      }

      // 담당자 정보 설정
      if (selectedDepartment) {
        managerInfo = {
          name: selectedDepartment.managerName || '담당자 없음',
          phone: selectedDepartment.fullPhone || selectedDepartment.managerPhone || '연락처 없음',
          department: selectedDepartment.department || ''
        };
      }
    }
    // 🎯 3. 기존 방식 지원 (호환성)
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

    console.log('🏪 매장 정보 포맷팅 결과:', info);
    return info;
  };

  // 주소 변환 콜백 함수들
  const handleOriginAddressConverted = (convertedData) => {
    console.log('출발지 주소 변환 완료:', convertedData);
    setOriginConvertedAddress(convertedData);
  };

  const handleDestinationAddressConverted = (convertedData) => {
    console.log('도착지 주소 변환 완료:', convertedData);
    setDestinationConvertedAddress(convertedData);
  };

  // 🎯 표시할 사용자 정보 계산 함수 (DeliveryTypeSelector 참고)
  const getDisplayUserInfo = () => {
    // userDetails (API에서 가져온 최신 정보) > requesterInfo > user 순서로 우선순위
    const currentUser = userDetails || user;
    const currentRequesterInfo = requesterInfo;
    
    if (!currentUser && !currentRequesterInfo) {
      return { custName: '상호명 없음', deptName: '부서명 없음', chargeName: '담당자명 없음', telNo: '연락처 없음' };
    }

    console.log('🎯 FloatingPreview - 사용자 정보 우선순위 확인:', {
      userDetails: userDetails,
      user: user,
      requesterInfo: currentRequesterInfo,
      userDetailsTelNo: userDetails?.tel_no,
      userTelNo: user?.tel_no,
      requesterTelNo: currentRequesterInfo?.telNo
    });

    // 각 필드별로 최적의 값 선택
    const displayInfo = {
      custName: userDetails?.cust_name || currentRequesterInfo?.custName || user?.cust_name || '상호명 없음',
      deptName: userDetails?.dept_name || currentRequesterInfo?.deptName || user?.dept_name || '부서명 없음',
      chargeName: userDetails?.charge_name || currentRequesterInfo?.chargeName || user?.charge_name || '담당자명 없음',
      // 🎯 tel_no는 userDetails를 최우선으로 사용
      telNo: userDetails?.tel_no || user?.tel_no || currentRequesterInfo?.telNo || '연락처 없음'
    };

    console.log('🎯 FloatingPreview - 최종 표시할 의뢰자 정보:', displayInfo);
    return displayInfo;
  };

  // 단계별 정보 구성 - 수정됨
  const getStepInfo = () => {
    const steps = [];

    // 0단계: 의뢰자 정보 - 수정됨
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

    // 2단계: 출발지 - 주소 변환 포함
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

    // 3단계: 도착지 - 주소 변환 포함
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

            {/* 강화된 디버깅 정보 (개발용) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium mb-2">연락처 디버깅 정보</p>
                <div className="text-xs text-blue-600 space-y-1">
                  <div><span className="font-medium">userDetails.tel_no:</span> "{userDetails?.tel_no}" (type: {typeof userDetails?.tel_no})</div>
                  <div><span className="font-medium">user.tel_no:</span> "{user?.tel_no}" (type: {typeof user?.tel_no})</div>
                  <div><span className="font-medium">requesterInfo.telNo:</span> "{requesterInfo?.telNo}" (type: {typeof requesterInfo?.telNo})</div>
                  <div><span className="font-medium">최종 사용값:</span> "{getDisplayUserInfo().telNo}"</div>
                  <div><span className="font-medium">포맷팅 결과:</span> "{formatPhoneNumber(getDisplayUserInfo().telNo)}"</div>
                  <div><span className="font-medium">로딩 상태:</span> {loadingUserDetails ? '로딩 중' : '완료'}</div>
                  {originConvertedAddress && (
                    <div><span className="font-medium">출발지:</span> {originConvertedAddress.dongAddress}</div>
                  )}
                  {destinationConvertedAddress && (
                    <div><span className="font-medium">도착지:</span> {destinationConvertedAddress.dongAddress}</div>
                  )}
                </div>
                
                {/* 테스트 버튼 */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const displayInfo = getDisplayUserInfo();
                      console.log('=== 연락처 테스트 ===');
                      console.log('userDetails.tel_no:', userDetails?.tel_no);
                      console.log('user.tel_no:', user?.tel_no);
                      console.log('requesterInfo.telNo:', requesterInfo?.telNo);
                      console.log('최종 사용값:', displayInfo.telNo);
                      console.log('포맷팅 결과:', formatPhoneNumber(displayInfo.telNo));
                      alert(`연락처 테스트:\nuserDetails: ${userDetails?.tel_no}\nuser: ${user?.tel_no}\nrequesterInfo: ${requesterInfo?.telNo}\n최종: ${formatPhoneNumber(displayInfo.telNo)}`);
                    }}
                    className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded hover:bg-blue-300 transition-colors"
                  >
                    연락처 테스트
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('=== 사용자 정보 새로고침 실행 ===');
                      fetchUserDetails();
                    }}
                    className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded hover:bg-green-300 transition-colors"
                  >
                    정보 새로고침
                  </button>
                </div>
              </div>
            )}
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