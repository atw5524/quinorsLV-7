import React, { useState, useEffect } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';
import SearchInput from '../common/SearchInput';
import Card from '../ui/Card';

const DestinationStoreSelector = () => {
  const { deliveryType, originStore, destinationStore, dispatch, setDestinationStore } = useDelivery();
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState(destinationStore);
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 부서별 담당자 선택 모달 관련 상태
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedStoreForDepartment, setSelectedStoreForDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDepartmentIndex, setSelectedDepartmentIndex] = useState(null);

  // 매장 데이터 가져오기
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/stores?active=true&limit=100', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();
        if (response.ok && result.success) {
          // 서버 데이터를 컴포넌트에서 사용할 형태로 변환
          const transformedStores = result.data.map(store => ({
            id: store._id,
            storeCode: store.storeCode,
            name: store.storeName,
            address: store.address || '주소 정보 없음',
            phone: store.fullPhone,
            isActive: store.isActive,
            accountIssued: store.accountIssued,
            createdAt: store.createdAt,
            // 부서별 담당자 정보 추가
            departments: store.departments || [],
            // 기존 담당자 정보 (호환성)
            managerName: store.managerName,
            fullPhone: store.fullPhone
          }));

          setStores(transformedStores);
          console.log('✅ 매장 데이터 로드 완료:', transformedStores.length);
        } else {
          throw new Error(result.message || '매장 데이터를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('❌ 매장 데이터 로드 실패:', error);
        setError(error.message);
        
        // 에러 발생 시 샘플 데이터 사용
        const sampleStores = [
          {
            id: 'sample-4',
            storeCode: 'ST004',
            name: '명동점',
            address: '서울 중구 남대문로 63',
            isActive: true,
            departments: [
              { department: '여성', managerName: '송여성', fullPhone: '010-6666-6666' },
              { department: '남성', managerName: '정남성', fullPhone: '010-7777-7777' },
              { department: '슈즈', managerName: '한슈즈', fullPhone: '010-8888-8888' }
            ]
          },
          {
            id: 'sample-5',
            storeCode: 'ST005',
            name: '신세계강남점',
            address: '서울 서초구 신반포로 176',
            isActive: true,
            departments: [
              { department: '여성', managerName: '윤여성', fullPhone: '010-9999-9999' },
              { department: '슈즈', managerName: '강슈즈', fullPhone: '010-0000-0000' }
            ]
          },
          {
            id: 'sample-6',
            storeCode: 'ST006',
            name: '현대판교점',
            address: '경기 성남시 분당구 판교역로 146',
            isActive: true,
            managerName: '박매니저',
            fullPhone: '010-1111-0000'
          }
        ];
        setStores(sampleStores);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const filteredStores = stores.filter(store => {
    const searchLower = searchTerm.toLowerCase();
    
    // 기본 매장 정보 검색
    const basicMatch = 
      store.name.toLowerCase().includes(searchLower) ||
      store.address.toLowerCase().includes(searchLower) ||
      store.storeCode.toLowerCase().includes(searchLower);
    
    // 기존 담당자 정보 검색 (호환성)
    const legacyMatch = 
      (store.managerName && store.managerName.toLowerCase().includes(searchLower));
    
    // 부서별 담당자 정보 검색
    const departmentMatch = store.departments && store.departments.some(dept =>
      dept.managerName.toLowerCase().includes(searchLower) ||
      dept.department.toLowerCase().includes(searchLower)
    );
    
    return basicMatch || legacyMatch || departmentMatch;
  });

  const handleStoreSelect = (store) => {
    // 부서별 담당자가 있는 경우 모달 표시
    if (store.departments && store.departments.length > 0) {
      setSelectedStoreForDepartment(store);
      setSelectedDepartment(null);
      setSelectedDepartmentIndex(null);
      setShowDepartmentModal(true);
    } else {
      // 기존 방식 (단일 담당자)
      const storeWithoutDepartment = {
        ...store,
        selectedDepartment: null,
        selectedDepartmentIndex: null,
        selectedManager: store.managerName
      };
      
      setSelectedStore(storeWithoutDepartment);
      
      console.log('✅ 단일 담당자 매장 선택:', {
        storeName: store.name,
        manager: store.managerName
      });
    }
  };

  const handleDepartmentSelect = (department, index) => {
    setSelectedDepartment(department);
    setSelectedDepartmentIndex(index);
    
    console.log('🎯 부서 선택:', {
      department: department.department,
      manager: department.managerName,
      index: index
    });
  };

  const handleConfirmDepartmentSelection = () => {
    if (selectedStoreForDepartment && selectedDepartment && selectedDepartmentIndex !== null) {
      const storeWithDepartment = {
        ...selectedStoreForDepartment,
        selectedDepartment: selectedDepartment.department,
        selectedDepartmentIndex: selectedDepartmentIndex,
        selectedManager: selectedDepartment.managerName,
        // 디버깅을 위한 추가 정보
        _selectedDepartmentData: selectedDepartment
      };
      
      setSelectedStore(storeWithDepartment);
      setShowDepartmentModal(false);
      setSelectedStoreForDepartment(null);
      setSelectedDepartment(null);
      setSelectedDepartmentIndex(null);
      
      console.log('✅ 부서별 매장 선택 완료:', {
        storeName: selectedStoreForDepartment.name,
        selectedDepartment: selectedDepartment.department,
        selectedDepartmentIndex: selectedDepartmentIndex,
        managerName: selectedDepartment.managerName,
        phone: selectedDepartment.fullPhone
      });
    }
  };

  const handleCancelDepartmentSelection = () => {
    setShowDepartmentModal(false);
    setSelectedStoreForDepartment(null);
    setSelectedDepartment(null);
    setSelectedDepartmentIndex(null);
  };

  const handleNext = () => {
    if (selectedStore && dispatch) {
      // DeliveryContext의 헬퍼 함수 사용 (권장)
      if (setDestinationStore) {
        setDestinationStore(
          selectedStore, 
          selectedStore.selectedDepartment, 
          selectedStore.selectedDepartmentIndex
        );
      } else {
        // 헬퍼 함수가 없는 경우 직접 dispatch
        dispatch({
          type: 'SET_DESTINATION_STORE',
          payload: {
            store: selectedStore,
            selectedDepartment: selectedStore.selectedDepartment,
            selectedDepartmentIndex: selectedStore.selectedDepartmentIndex
          }
        });
      }
      
      console.log('🚀 도착지 설정 완료:', {
        storeName: selectedStore.name,
        selectedDepartment: selectedStore.selectedDepartment,
        selectedDepartmentIndex: selectedStore.selectedDepartmentIndex
      });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const getPreviewContent = () => {
    if (originStore && selectedStore) {
      // 같은 매장인 경우 표시 방법 개선
      if (originStore.id === selectedStore.id) {
        const originDept = originStore.selectedDepartment ? `${originStore.selectedDepartment.department}` : '';
        const destDept = selectedStore.selectedDepartment ? `${selectedStore.selectedDepartment.department}` : '';
        return `${deliveryType} • ${selectedStore.name} (${originDept} → ${destDept})`;
      }
      
      const originInfo = originStore.selectedDepartment 
        ? `${originStore.name}(${originStore.selectedDepartment.department})`
        : originStore.name;
      const destInfo = selectedStore.selectedDepartment 
        ? `${selectedStore.name}(${selectedStore.selectedDepartment})`
        : selectedStore.name;
      
      return `${deliveryType} • ${originInfo} → ${destInfo}`;
    }
    return deliveryType || '도착지 선택';
  };

  // 매장의 담당자 정보 렌더링
  const renderManagerInfo = (store) => {
    if (store.departments && store.departments.length > 0) {
      // 새로운 부서별 구조
      return (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {store.departments.map((dept, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded"
              >
                {dept.department}: {dept.managerName}
              </span>
            ))}
          </div>
        </div>
      );
    } else if (store.managerName) {
      // 기존 구조
      return (
        <div className="mt-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            담당자: {store.managerName}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
        
        <Header 
          title="도착지 선택"
          subtitle="도착지 매장을 선택해주세요"
          currentStep={3}
          onBack={handleBack}
          onClose={handleClose}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-4 overflow-y-auto pb-20">
          <SearchInput 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="매장명, 주소, 매장코드, 담당자로 검색"
          />

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-600">매장 정보를 불러오는 중...</span>
            </div>
          )}

          {/* 에러 상태 */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <p className="text-xs text-red-600 mt-1">샘플 데이터로 진행합니다.</p>
            </div>
          )}

          {/* 매장 목록 */}
          <div className="flex flex-col gap-4">
            {filteredStores.length === 0 && !loading ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
                <p className="text-gray-400 text-xs mt-1">다른 검색어를 시도해보세요.</p>
              </div>
            ) : (
              filteredStores.map((store) => (
                <Card
                  key={store.id}
                  selected={selectedStore?.id === store.id}
                  onClick={() => handleStoreSelect(store)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                      <i className="fa-solid fa-store"></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-800">
                          {store.name}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {store.address}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        {/* 부서 개수만 표시 */}
                        <div className="flex items-center gap-2">
                          {store.departments && store.departments.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {store.departments.length}개
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* 같은 매장 선택 시 추가 안내 */}
                          {originStore && originStore.id === store.id && selectedStore?.id === store.id && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                              매장 내 배송
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </main>

        {/* 부서별 담당자 선택 모달 */}
        {showDepartmentModal && selectedStoreForDepartment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">담당자 선택</h3>
                <button
                  onClick={handleCancelDepartmentSelection}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* 선택된 매장 정보 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                    <i className="fa-solid fa-store text-xs"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedStoreForDepartment.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      {selectedStoreForDepartment.storeCode}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                담당자를 선택해주세요:
              </p>

              {/* 부서별 담당자 목록 */}
              <div className="space-y-3">
                {selectedStoreForDepartment.departments.map((dept, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedDepartment?.department === dept.department
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                    }`}
                    onClick={() => handleDepartmentSelect(dept, index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {dept.department}매장
                          </span>
                          {selectedDepartment?.department === dept.department && (
                            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">
                          담당자: {dept.managerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          연락처: {dept.fullPhone}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 모달 버튼 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelDepartmentSelection}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmDepartmentSelection}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  disabled={!selectedDepartment}
                >
                  선택 완료
                </button>
              </div>
            </div>
          </div>
        )}

        <FloatingPreview 
          content={getPreviewContent()}
          onEdit={() => dispatch({ type: 'SET_STEP', payload: 1 })}
          show={true}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleNext} disabled={!selectedStore || loading}>
            다음 단계
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default DestinationStoreSelector;