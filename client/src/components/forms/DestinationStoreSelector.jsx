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

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedStoreData, setSelectedStoreData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);
  const [departmentManagers, setDepartmentManagers] = useState([]);
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
            createdAt: store.createdAt,
            departments: departmentGroups
          };
        });
        
        setStores(finalStores);
        
        setTimeout(() => {
          triggerUpdate();
        }, 100);
        
      } catch (error) {
        setError(error.message);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [token, triggerUpdate]);

  // 검색 필터링
  const filteredStores = React.useMemo(() => {
    if (!Array.isArray(stores) || stores.length === 0) {
      return [];
    }

    if (!searchTerm.trim()) {
      return stores;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return stores.filter(store => {
      const matchStore = (store.name && store.name.toLowerCase().includes(searchLower)) ||
                        (store.storeCode && store.storeCode.toLowerCase().includes(searchLower)) ||
                        (store.address && store.address.toLowerCase().includes(searchLower));
      
      const matchManager = Object.values(store.departments || {}).some(managers =>
        Array.isArray(managers) && managers.some(manager => 
          manager && manager.managerName && manager.managerName.toLowerCase().includes(searchLower)
        )
      );
      
      return matchStore || matchManager;
    });
  }, [stores, searchTerm, forceUpdate]);

  // ✅ 출발지 매장 ID 추출 함수 (단순화)
  const getOriginStoreId = () => {
    if (!originStore) return null;
    
    // 다양한 경로로 매장 ID 추출 시도
    if (originStore.store?.id) return originStore.store.id;
    if (originStore.id) return originStore.id;
    if (originStore._id) return originStore._id;
    
    return null;
  };

  // ✅ 출발지와 동일한 매장인지 체크
  const isOriginStore = (storeId) => {
    const originStoreId = getOriginStoreId();
    return originStoreId === storeId;
  };

  // ✅ 해당 매장이 선택 가능한지 체크 (출발지 매장이 아닌 경우만 선택 가능)
  const isStoreSelectable = (store) => {
    return !isOriginStore(store.id);
  };

  // 매장 선택 시 모달 열기
  const handleStoreSelect = (store) => {
    console.log('🔍 매장 클릭됨:', store.name);
    
    // ✅ 출발지 매장인지 체크
    if (isOriginStore(store.id)) {
      alert('출발지와 동일한 매장은 도착지로 선택할 수 없습니다.\n다른 매장을 선택해주세요.');
      return;
    }

    setSelectedStoreData(store);
    setShowModal(true);
    setModalStep(1);
    setSelectedDepartment(null);
    setSelectedManager(null);
    setModalSearchTerm('');
  };

  // 모달에서 부서 선택
  const handleModalDepartmentSelect = (department) => {
    console.log('🔍 부서 선택:', department);
    setSelectedDepartment(department);
    const managers = selectedStoreData.departments[department] || [];
    
    // ✅ 출발지 매장이 아니므로 모든 담당자 선택 가능
    setDepartmentManagers(managers);
    setModalStep(2);
    setModalSearchTerm('');
  };

  // 모달에서 담당자 선택
  const handleModalManagerSelect = (manager) => {
    console.log('🔍 담당자 선택:', manager.managerName);
    setSelectedManager(manager);
  };

  // 모달에서 선택 완료
  const handleModalConfirm = () => {
    if (selectedManager && selectedDepartment && selectedStoreData) {
      console.log('🔍 최종 선택 확인:', {
        store: selectedStoreData.name,
        department: selectedDepartment,
        manager: selectedManager.managerName
      });

      const finalSelection = {
        store: selectedStoreData,
        department: selectedDepartment,
        manager: selectedManager,
        displayName: `${selectedStoreData.name} ${selectedDepartment} - ${selectedManager.managerName}`
      };
      
      console.log('✅ 도착지 선택 완료:', finalSelection);
      
      setSelectedStore(finalSelection);
      dispatch({ type: 'SET_DESTINATION_STORE', payload: finalSelection });
      setShowModal(false);
    }
  };

  // 모달 닫기
  const handleModalClose = () => {
    setShowModal(false);
    setModalStep(1);
    setSelectedDepartment(null);
    setSelectedManager(null);
    setModalSearchTerm('');
  };

  // 모달 뒤로가기
  const handleModalBack = () => {
    if (modalStep === 2) {
      setModalStep(1);
      setSelectedManager(null);
      setModalSearchTerm('');
    } else {
      handleModalClose();
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  const handleNext = () => {
    if (selectedStore && selectedStore.manager) {
      dispatch({ type: 'SET_DESTINATION_STORE', payload: selectedStore });
      dispatch({ type: 'SET_STEP', payload: 4 });
    }
  };

  const getPreviewContent = () => {
    if (selectedStore && selectedStore.displayName) {
      return `도착지: ${selectedStore.displayName}`;
    }
    return '';
  };

  const getDepartmentColor = (department) => {
    const colors = {
      '여성': 'bg-pink-100 text-pink-600 border-pink-200',
      '남성': 'bg-blue-100 text-blue-600 border-blue-200',
      '슈즈': 'bg-green-100 text-green-600 border-green-200',
      '일반': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[department] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  // 모달 내 담당자 검색 필터링
  const filteredDepartmentManagers = departmentManagers.filter(manager => {
    if (!modalSearchTerm.trim()) return true;
    
    return (
      (manager && manager.managerName && manager.managerName.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
      (manager && manager.fullPhone && manager.fullPhone.includes(modalSearchTerm)) ||
      (manager && manager.phone && manager.phone.includes(modalSearchTerm))
    );
  });

  // ✅ 출발지 정보 표시용
  const originStoreId = getOriginStoreId();
  const originStoreInfo = stores.find(s => s.id === originStoreId);

  return (
    <>
      <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
          
          <div className="relative z-30">
            <Header 
              title="도착지 선택"
              subtitle="도착지 매장을 선택해주세요"
              currentStep={3}
              onBack={handleBack}
            />
          </div>

          <main className="flex-1 bg-gray-50 p-6 space-y-4 overflow-y-auto pb-20">
            <SearchInput
              placeholder="매장명, 매장코드, 담당자명으로 검색"
              value={searchTerm}
              onChange={setSearchTerm}
            />

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">매장 정보를 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-2">{error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStores.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">
                      {stores.length === 0 ? '매장 데이터가 없습니다.' : '검색 결과가 없습니다.'}
                    </p>
                  </div>
                ) : (
                  filteredStores.map((store, index) => {
                    const isOrigin = isOriginStore(store.id);
                    const isSelectable = isStoreSelectable(store);
                    
                    return (
                      <Card
                        key={`${store.id}-${index}`}
                        onClick={() => handleStoreSelect(store)}
                        className={`transition-all ${
                          !isSelectable 
                            ? 'opacity-50 cursor-not-allowed border-red-300 bg-red-50' 
                            : 'cursor-pointer hover:border-orange-300 hover:shadow-lg'
                        } ${
                          isOrigin ? 'border-red-400 bg-red-100' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold ${isOrigin ? 'text-red-700' : 'text-gray-800'}`}>
                                {store.name}
                              </h3>
                              {isOrigin && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                  출발지 매장
                                </span>
                              )}
                              {!isSelectable && (
                                <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full font-medium">
                                  선택 불가
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${isOrigin ? 'text-red-600' : 'text-gray-600'}`}>
                              {store.storeCode}
                            </p>
                            <p className={`text-xs mt-1 ${isOrigin ? 'text-red-500' : 'text-gray-500'}`}>
                              {store.address}
                            </p>
                            
                            {/* 부서 표시 */}
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {Object.entries(store.departments || {}).map(([dept, managers]) => (
                                <span 
                                  key={dept}
                                  className={`px-2 py-1 text-xs rounded-full border ${
                                    isOrigin 
                                      ? 'bg-red-100 text-red-600 border-red-200' 
                                      : getDepartmentColor(dept)
                                  }`}
                                >
                                  {dept} ({managers.length}명)
                                </span>
                              ))}
                            </div>
                            
                            {/* 출발지 매장인 경우 안내 메시지 */}
                            {isOrigin && (
                              <div className="mt-2 text-xs text-red-600 font-medium">
                                출발지와 동일한 매장으로 선택할 수 없습니다
                              </div>
                            )}
                          </div>
                          <i className={`fa-solid ${isSelectable ? 'fa-chevron-right' : 'fa-ban'} ${
                            isOrigin ? 'text-red-400' : 'text-gray-400'
                          }`}></i>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </main>

          <FloatingPreview
            content={getPreviewContent()}
            onEdit={() => {
              setSelectedStore(null);
            }}
            show={!!selectedStore}
          />

          <footer className="p-6 border-t border-gray-200 bg-white">
            <Button 
              onClick={handleNext} 
              disabled={!selectedStore || loading}
            >
              다음 단계
            </Button>
          </footer>
        </div>
      </div>

      {/* 부서/담당자 선택 모달 */}
      {showModal && selectedStoreData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden shadow-2xl">
            
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8">
                  {modalStep === 2 ? (
                    <button 
                      onClick={handleModalBack}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                    >
                      <i className="fas fa-arrow-left text-white text-sm"></i>
                    </button>
                  ) : null}
                </div>
                
                <h2 className="text-lg font-bold">
                  {modalStep === 1 ? '부서 선택' : '담당자 선택'}
                </h2>
                
                <button 
                  onClick={handleModalClose}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                >
                  <i className="fas fa-times text-white text-sm"></i>
                </button>
              </div>
              
              <p className="text-white/90 text-sm text-center">
                {modalStep === 1 ? "부서를 선택해주세요" : "담당자를 선택해주세요"}
              </p>
            </div>

            {/* 매장 정보 표시 */}
            <div className="bg-gray-50 p-3 border-b">
              <h3 className="font-bold text-gray-800 text-sm">{selectedStoreData.name}</h3>
              <p className="text-xs text-gray-600">{selectedStoreData.storeCode}</p>
              <div className="flex items-center gap-1 mt-2">
                <i className="fas fa-check-circle text-green-500 text-xs"></i>
                <p className="text-xs text-green-600 font-medium">선택 가능한 매장입니다</p>
              </div>
            </div>

            {/* 담당자 선택 단계에서 검색 */}
            {modalStep === 2 && (
              <div className="p-4 border-b">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="담당자명 또는 연락처로 검색"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                </div>
              </div>
            )}

            {/* 모달 내용 */}
            <div className="flex-1 p-4 overflow-y-auto">
              {/* 1단계: 부서 선택 */}
              {modalStep === 1 && (
                <div className="space-y-3">
                  {Object.entries(selectedStoreData.departments || {}).map(([dept, managers]) => (
                    <div
                      key={dept}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all"
                      onClick={() => handleModalDepartmentSelect(dept)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getDepartmentColor(dept)}`}>
                            <i className="fas fa-users text-sm"></i>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">{dept} 매장</h3>
                            <p className="text-xs text-gray-600">담당자 {managers.length}명</p>
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
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
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