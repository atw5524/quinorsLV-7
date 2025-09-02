import React, { useState, useEffect, useCallback } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';
import SearchInput from '../common/SearchInput';
import Card from '../ui/Card';

const DestinationStoreSelector = () => {
  const { deliveryType, originStore, destinationStore, dispatch, setDestinationStore } = useDelivery();
  const { user, token } = useAuth();
  
  const [selectedStore, setSelectedStore] = useState(destinationStore);
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);

  // 3단계 선택 상태 (모달에서 사용)
  const [selectedStoreData, setSelectedStoreData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);
  const [departmentManagers, setDepartmentManagers] = useState([]);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // 강제 리렌더링 함수
  const triggerUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1);
  }, []);

  // 매장 데이터 가져오기
  useEffect(() => {
    const fetchStores = async () => {
      if (!token) {
        setLoading(false);
        setError('로그인이 필요합니다');
        setStores([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/stores?active=true&limit=100', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          throw new Error(`API 호출 실패: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('매장 데이터가 없습니다');
        }

        // 서버 응답 구조에 맞게 데이터 처리
        const finalStores = result.data.map((store) => {
          // 부서별로 담당자 그룹화
          const departmentGroups = {};
          
          if (Array.isArray(store.departments)) {
            store.departments.forEach((dept, deptIndex) => {
              const department = dept.department || '일반';
              const managerName = dept.managerName || '담당자';

              if (!departmentGroups[department]) {
                departmentGroups[department] = [];
              }

              departmentGroups[department].push({
                id: `${store._id}_${department}_${managerName}_${deptIndex}`,
                managerName: managerName,
                phone: dept.managerPhone || '',
                fullPhone: dept.fullPhone || (dept.managerPhone ? 
                  dept.managerPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '')
              });
            });
          }

          return {
            id: store._id,
            storeCode: store.storeCode || '',
            name: store.storeName || '',
            address: store.address || '',
            isActive: store.isActive !== false,
            departments: store.departments || [],
            departmentGroups: departmentGroups
          };
        });

        // 출발지와 같은 매장 필터링
        const filteredStores = finalStores.filter(store => 
          !originStore || store.id !== originStore.id
        );

        console.log('✅ 도착지 매장 데이터 로딩 완료:', filteredStores.length, '개');
        setStores(filteredStores);
        setLoading(false);

      } catch (error) {
        console.error('❌ 매장 데이터 로딩 실패:', error);
        setError(error.message || '매장 데이터를 불러오는데 실패했습니다');
        setStores([]);
        setLoading(false);
      }
    };

    fetchStores();
  }, [token, forceUpdate, originStore]);

  // 검색 필터링
  const filteredStores = stores.filter(store => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      store.name.toLowerCase().includes(searchLower) ||
      store.address.toLowerCase().includes(searchLower) ||
      store.storeCode.toLowerCase().includes(searchLower)
    );
  });

  // 부서 색상 함수
  const getDepartmentColor = (department) => {
    const colors = {
      '매장': 'bg-blue-100 text-blue-700 border-blue-200',
      '창고': 'bg-green-100 text-green-700 border-green-200',
      '사무실': 'bg-purple-100 text-purple-700 border-purple-200',
      '일반': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[department] || colors['일반'];
  };

  // 매장 선택 핸들러
  const handleStoreSelect = (store) => {
    console.log('도착지 매장 선택:', store.name);
    setSelectedStoreData(store);
    setModalStep(1);
    setModalSearchTerm('');
    setShowModal(true);
  };

  // 모달에서 부서 선택
  const handleModalDepartmentSelect = (department) => {
    console.log('도착지 부서 선택:', department);
    setSelectedDepartment(department);
    
    // 해당 부서의 담당자들 설정
    const managers = selectedStoreData.departmentGroups[department] || [];
    setDepartmentManagers(managers);
    setModalStep(2);
  };

  // 모달에서 담당자 선택
  const handleModalManagerSelect = (manager) => {
    console.log('도착지 담당자 선택:', manager);
    setSelectedManager(manager);
  };

  // 모달 확인 (최종 선택 완료)
  const handleModalConfirm = () => {
    if (!selectedManager || !selectedStoreData || !selectedDepartment) {
      alert('모든 정보를 선택해주세요.');
      return;
    }

    // 🎯 선택된 매장 정보에 부서와 담당자 정보 추가
    const completeStoreInfo = {
      ...selectedStoreData,
      // 선택된 부서 정보 추가
      selectedDepartment: selectedDepartment,
      selectedDepartmentIndex: selectedStoreData.departments.findIndex(
        dept => dept.department === selectedDepartment
      ),
      // 선택된 담당자 정보 추가 (FloatingPreview에서 쉽게 접근할 수 있도록)
      selectedManagerInfo: {
        name: selectedManager.managerName,
        phone: selectedManager.fullPhone,
        department: selectedDepartment
      }
    };

    console.log('✅ 최종 선택된 도착지 정보:', completeStoreInfo);

    // Context에 저장 (헬퍼 함수 사용)
    setDestinationStore(completeStoreInfo, selectedDepartment, completeStoreInfo.selectedDepartmentIndex);
    setSelectedStore(completeStoreInfo);

    // 모달 초기화
    setShowModal(false);
    setModalStep(1);
    setSelectedStoreData(null);
    setSelectedDepartment(null);
    setSelectedManager(null);
    setDepartmentManagers([]);
  };

  // 계속하기 버튼 핸들러
  const handleContinue = () => {
    if (!selectedStore) {
      alert('도착지 매장을 선택해주세요.');
      return;
    }
    dispatch({ type: 'SET_STEP', payload: 4 });
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  // 닫기 핸들러
  const handleClose = () => {
    console.log('닫기');
  };

  // 미리보기 컨텐츠 생성
  const getPreviewContent = () => {
    let content = deliveryType || '';
    
    if (originStore) {
      const originManagerInfo = originStore.selectedManagerInfo || {};
      content += ` • ${originStore.name}`;
    }
    
    if (selectedStore) {
      const destinationManagerInfo = selectedStore.selectedManagerInfo || {};
      content += ` → ${selectedStore.name} (${destinationManagerInfo.name || '담당자 미선택'})`;
    }
    
    return content || '도착지 선택';
  };

  // 모달 내 검색 필터링
  const filteredDepartmentManagers = departmentManagers.filter(manager => {
    if (!modalSearchTerm.trim()) return true;
    return manager.managerName.toLowerCase().includes(modalSearchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
          <Header
            title="도착지 선택"
            subtitle="매장 정보를 불러오는 중..."
            currentStep={3}
            onBack={handleBack}
            onClose={handleClose}
          />
          <main className="flex-1 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">매장 정보를 불러오는 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
          <Header
            title="도착지 선택"
            subtitle="오류가 발생했습니다"
            currentStep={3}
            onBack={handleBack}
            onClose={handleClose}
          />
          <main className="flex-1 bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={triggerUpdate}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
          <Header
            title="도착지 선택"
            subtitle="물품을 받을 매장을 선택해주세요"
            currentStep={3}
            onBack={handleBack}
            onClose={handleClose}
          />

          <main className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
            {/* 출발지 정보 표시 */}
            {originStore && (
              <div className="px-6 pt-4 pb-2">
                <div className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <i className="fa-solid fa-arrow-right text-orange-500"></i>
                    <span className="text-gray-600">출발지:</span>
                    <span className="font-medium text-gray-800">{originStore.name}</span>
                    {originStore.selectedManagerInfo && (
                      <span className="text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
                        {originStore.selectedManagerInfo.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 검색 입력 */}
            <div className="px-6 pb-4">
              <SearchInput
                placeholder="매장명, 주소, 매장코드로 검색..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            {/* 매장 목록 */}
            <div className="flex-1 overflow-y-auto px-6 pb-20">
              {filteredStores.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
                  <p className="text-gray-500 text-center">
                    {searchTerm ? '검색 결과가 없습니다.' : '선택 가능한 매장이 없습니다.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-orange-500 text-sm hover:underline"
                    >
                      전체 매장 보기
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStores.map((store) => (
                    <Card
                      key={store.id}
                      selected={selectedStore?.id === store.id}
                      onClick={() => handleStoreSelect(store)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800 text-sm">{store.name}</h3>
                            {store.storeCode && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {store.storeCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{store.address}</p>
                          
                          {/* 부서 정보 표시 */}
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(store.departmentGroups).map((department) => (
                              <span
                                key={department}
                                className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getDepartmentColor(department)}`}
                              >
                                {department} ({store.departmentGroups[department].length}명)
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="ml-3">
                          {selectedStore?.id === store.id ? (
                            <i className="fas fa-check-circle text-orange-500 text-xl"></i>
                          ) : (
                            <i className="fas fa-chevron-right text-gray-400"></i>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>

          <FloatingPreview
            content={getPreviewContent()}
            onEdit={() => dispatch({ type: 'SET_STEP', payload: 1 })}
            show={true}
          />

          <footer className="p-6 border-t border-gray-200 bg-white">
            <Button 
              onClick={handleContinue}
              disabled={!selectedStore}
            >
              계속하기
            </Button>
          </footer>
        </div>
      </div>

      {/* 3단계 선택 모달 */}
      {showModal && selectedStoreData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm mx-4 max-h-[80vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedStoreData.name}</h2>
                  <p className="text-sm text-gray-600">
                    {modalStep === 1 ? '부서 선택' : '담당자 선택'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              {modalStep === 2 && (
                <div className="mt-4">
                  <SearchInput
                    placeholder="담당자 검색..."
                    value={modalSearchTerm}
                    onChange={setModalSearchTerm}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 1단계: 부서 선택 */}
              {modalStep === 1 && (
                <div className="space-y-3">
                  {Object.keys(selectedStoreData.departmentGroups).map((department) => (
                    <div
                      key={department}
                      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDepartment === department
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300 hover:shadow-lg'
                      }`}
                      onClick={() => handleModalDepartmentSelect(department)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getDepartmentColor(department).includes('blue') ? 'bg-blue-500' : 
                            getDepartmentColor(department).includes('green') ? 'bg-green-500' : 
                            getDepartmentColor(department).includes('purple') ? 'bg-purple-500' : 'bg-gray-500'}`}>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">{department} 매장</h3>
                            <p className="text-xs text-gray-600">
                              담당자 {selectedStoreData.departmentGroups[department].length}명
                            </p>
                          </div>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2단계: 담당자 선택 */}
              {modalStep === 2 && selectedDepartment && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3 border mb-4">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getDepartmentColor(selectedDepartment)}`}>
                      {selectedDepartment} 매장
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredDepartmentManagers.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">
                          {modalSearchTerm ? '검색 결과가 없습니다.' : '담당자가 없습니다.'}
                        </p>
                      </div>
                    ) : (
                      filteredDepartmentManagers.map((manager, index) => (
                        <div
                          key={manager.id || index}
                          className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedManager?.id === manager.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-300 hover:shadow-lg'
                          }`}
                          onClick={() => handleModalManagerSelect(manager)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {manager.managerName.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-800 text-sm">{manager.managerName}</h3>
                                <p className="text-xs text-gray-600">
                                  {manager.fullPhone || '연락처 없음'}
                                </p>
                              </div>
                            </div>
                            {selectedManager?.id === manager.id && (
                              <i className="fas fa-check text-orange-500"></i>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleModalConfirm}
                disabled={!selectedManager}
                className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {selectedManager ? '선택 완료' : '담당자를 선택해주세요'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DestinationStoreSelector;