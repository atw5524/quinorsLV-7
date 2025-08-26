import React, { useState, useEffect, useRef } from 'react';

const AccountManage = ({ onBackToAdmin }) => {
  const [stats, setStats] = useState({
    total: 0,
    notIssued: 0,
    issued: 0,
    inactive: 0
  });
  
  const [allStores, setAllStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  
  // 새 매장 추가/수정 폼 데이터 - 부서별 담당자 지원 + User 자동 생성 옵션 추가
  const [formData, setFormData] = useState({
    storeCode: '',
    storeName: '',
    address: '',
    notes: '',
    autoCreateUsers: true, // 👈 User 자동 생성 옵션 추가
    departments: [
      { department: '여성', managerName: '', fullPhone: '' }
    ]
  });

  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);

  // API 호출 함수들
  const fetchAllStores = async () => {
    try {
      console.log('🏪 매장 목록 API 호출 시작...');
      setLoading(true);
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/stores');
      const result = await response.json();
      console.log('🏪 매장 목록 API 응답:', result);

      if (response.ok && result.success) {
        const stores = result.data || [];
        console.log('🏪 ✅ 매장 목록 데이터 처리 성공:', stores);
        
        if (isMountedRef.current) {
          setAllStores(stores);
          setFilteredStores(stores);
          calculateStats(stores);
          setError(null);
        }
      } else {
        console.error('🏪 ❌ 매장 목록 API 실패');
        setError('매장 목록 조회 실패');
        if (isMountedRef.current) {
          setAllStores([]);
          setFilteredStores([]);
        }
      }
    } catch (error) {
      console.error('🏪 ❌ 매장 목록 조회 네트워크 오류:', error);
      setError('매장 목록 조회 중 네트워크 오류: ' + error.message);
      if (isMountedRef.current) {
        setAllStores([]);
        setFilteredStores([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const calculateStats = (storeData) => {
    const total = storeData.length;
    const inactive = storeData.filter(store => !store.isActive).length;
    const active = storeData.filter(store => store.isActive).length;
    
    // 부서별 담당자가 있는 경우와 기존 방식 모두 고려
    let notIssued = 0;
    let issued = 0;
    
    storeData.forEach(store => {
      if (!store.isActive) return;
      
      if (store.departments && store.departments.length > 0) {
        // 새로운 부서별 구조
        const hasUnissuedDept = store.departments.some(dept => !dept.accountIssued);
        const hasIssuedDept = store.departments.some(dept => dept.accountIssued);
        
        if (hasUnissuedDept) notIssued++;
        if (hasIssuedDept) issued++;
      } else {
        // 기존 구조
        if (store.accountIssued) {
          issued++;
        } else {
          notIssued++;
        }
      }
    });
    
    setStats({ total, notIssued, issued, inactive });
    console.log('📊 통계 계산:', { total, notIssued, issued, inactive });
  };

  // 부서 추가
  const addDepartment = () => {
    const availableDepartments = ['여성', '남성', '슈즈'];
    const usedDepartments = formData.departments.map(d => d.department);
    const nextDepartment = availableDepartments.find(d => !usedDepartments.includes(d));
    
    if (nextDepartment) {
      setFormData({
        ...formData,
        departments: [
          ...formData.departments,
          { department: nextDepartment, managerName: '', fullPhone: '' }
        ]
      });
    }
  };

  // 부서 제거
  const removeDepartment = (index) => {
    if (formData.departments.length > 1) {
      setFormData({
        ...formData,
        departments: formData.departments.filter((_, i) => i !== index)
      });
    }
  };

  // 부서 정보 업데이트
  const updateDepartment = (index, field, value) => {
    const updatedDepartments = [...formData.departments];
    updatedDepartments[index] = { ...updatedDepartments[index], [field]: value };
    setFormData({ ...formData, departments: updatedDepartments });
  };

  // 매장 추가 - phoneLast4 자동 생성 + User 계정 자동 생성 포함
  const handleAddStore = async () => {
    // 기본 정보 검증
    if (!formData.storeCode || !formData.storeName) {
      alert('매장코드와 매장명을 입력해주세요.');
      return;
    }

    // 부서 정보 검증
    const invalidDept = formData.departments.find(dept => 
      !dept.managerName || !dept.fullPhone
    );
    
    if (invalidDept) {
      alert('모든 매장의 담당자명과 연락처를 입력해주세요.');
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    const invalidPhone = formData.departments.find(dept => 
      !phoneRegex.test(dept.fullPhone)
    );
    
    if (invalidPhone) {
      alert('올바른 휴대폰 번호 형식으로 입력해주세요. (예: 010-1234-5678)');
      return;
    }

    try {
      console.log('➕ 매장 추가 시작:', formData);
      
      // 부서별 phoneLast4 자동 생성
      const processedFormData = { ...formData };
      if (processedFormData.departments && processedFormData.departments.length > 0) {
        processedFormData.departments = processedFormData.departments.map(dept => ({
          ...dept,
          // phoneLast4 자동 추출
          phoneLast4: dept.fullPhone.replace(/[^0-9]/g, '').slice(-4)
        }));
      }

      console.log('➕ 처리된 추가 데이터:', processedFormData);

      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedFormData),
      });

      const result = await response.json();
      console.log('➕ 매장 추가 API 응답:', result);

      if (response.ok && result.success) {
        let message = '매장이 성공적으로 등록되었습니다.';
        
        // User 계정이 생성된 경우 추가 메시지
        if (result.data.createdUsers && result.data.createdUsers.length > 0) {
          message += `\n\n생성된 계정 정보:\n`;
          result.data.createdUsers.forEach(user => {
            message += `• ${user.department}부 ${user.managerName}: ${user.userId} (비밀번호: ${user.tempPassword})\n`;
          });
          message += '\n⚠️ 임시 비밀번호를 담당자에게 안전하게 전달해주세요.';
        }
        
        alert(message);
        setShowAddModal(false);
        resetFormData();
        await fetchAllStores();
      } else {
        alert(`매장 등록 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('➕ 매장 등록 실패:', error);
      alert('매장 등록 중 오류가 발생했습니다.');
    }
  };

  // 매장 수정 - phoneLast4 자동 생성
  const handleEditStore = async () => {
    // 기본 정보 검증
    if (!formData.storeCode || !formData.storeName) {
      alert('매장코드와 매장명을 입력해주세요.');
      return;
    }

    // 부서 정보 검증 (기존 데이터는 departments가 없을 수 있음)
    if (formData.departments && formData.departments.length > 0) {
      const invalidDept = formData.departments.find(dept => 
        !dept.managerName || !dept.fullPhone
      );
      
      if (invalidDept) {
        alert('모든 매장의 담당자명과 연락처를 입력해주세요.');
        return;
      }

      // 전화번호 형식 검증
      const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
      const invalidPhone = formData.departments.find(dept => 
        !phoneRegex.test(dept.fullPhone)
      );
      
      if (invalidPhone) {
        alert('올바른 휴대폰 번호 형식으로 입력해주세요. (예: 010-1234-5678)');
        return;
      }
    }

    try {
      console.log('✏️ 매장 수정 시작:', editingStore._id, formData);
      
      // 부서별 phoneLast4 자동 생성
      const processedFormData = { ...formData };
      if (processedFormData.departments && processedFormData.departments.length > 0) {
        processedFormData.departments = processedFormData.departments.map(dept => ({
          ...dept,
          // phoneLast4 자동 추출
          phoneLast4: dept.fullPhone.replace(/[^0-9]/g, '').slice(-4)
        }));
      }

      console.log('✏️ 처리된 수정 데이터:', processedFormData);

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/stores/${editingStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedFormData),
      });

      const result = await response.json();
      console.log('✏️ 매장 수정 API 응답:', result);

      if (response.ok && result.success) {
        alert('매장 정보가 성공적으로 수정되었습니다.');
        setEditingStore(null);
        resetFormData();
        await fetchAllStores();
      } else {
        alert(`매장 수정 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('✏️ 매장 수정 실패:', error);
      alert('매장 수정 중 오류가 발생했습니다.');
    }
  };

  // 폼 데이터 리셋 - autoCreateUsers 추가
  const resetFormData = () => {
    setFormData({
      storeCode: '',
      storeName: '',
      address: '',
      notes: '',
      autoCreateUsers: true, // 👈 기본값 true
      departments: [
        { department: '여성', managerName: '', fullPhone: '' }
      ]
    });
  };

  // 매장 상태 변경 (활성화/비활성화)
  const handleToggleStoreStatus = async (storeId, currentStatus, buttonElement) => {
    if (!isMountedRef.current) return;

    try {
      const newStatus = !currentStatus;
      console.log(`🔄 매장 상태 변경 시작: ${storeId}, ${currentStatus} -> ${newStatus}`);

      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }

      setProcessingIds(prev => new Set([...prev, storeId]));

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: newStatus,
          notes: `관리자에 의한 ${newStatus ? '활성화' : '비활성화'}`
        }),
      });

      const result = await response.json();
      console.log('🔄 매장 상태 변경 API 응답:', result);

      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-white');
            const statusBadge = parentCard.querySelector('span[class*="rounded-full"]');

            if (newStatus) {
              buttonElement.innerHTML = '비활성화';
              buttonElement.className = 'flex-1 py-2.5 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200 hover:bg-red-100 transition-colors';
              if (statusBadge) {
                statusBadge.className = getStatusBadge({ isActive: true, accountIssued: false });
                statusBadge.textContent = getStatusText({ isActive: true, accountIssued: false });
              }
            } else {
              buttonElement.innerHTML = '활성화';
              buttonElement.className = 'flex-1 py-2.5 bg-green-50 text-green-600 text-sm rounded-xl font-medium border border-green-200 hover:bg-green-100 transition-colors';
              if (statusBadge) {
                statusBadge.className = getStatusBadge({ isActive: false, accountIssued: false });
                statusBadge.textContent = getStatusText({ isActive: false, accountIssued: false });
              }
            }
            buttonElement.disabled = false;
          }
        }, 1500);

        await fetchAllStores();
      } else {
        console.error('🔄 매장 상태 변경 실패:', result);
        alert(`상태 변경 실패: ${result.message}`);
        if (buttonElement) {
          buttonElement.innerHTML = currentStatus ? '비활성화' : '활성화';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('🔄 매장 상태 변경 중 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
      if (buttonElement) {
        buttonElement.innerHTML = currentStatus ? '비활성화' : '활성화';
        buttonElement.disabled = false;
      }
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(storeId);
        return newSet;
      });
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    filterStores(term, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterStores(searchTerm, filter);
  };

  const filterStores = (searchTerm, filter) => {
    let filtered = [...allStores];

    // 검색 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(store => {
        // 기본 매장 정보 검색
        const basicMatch = 
          store.storeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.storeName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 기존 담당자 정보 검색 (호환성)
        const legacyMatch = 
          (store.managerName && store.managerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (store.phoneLast4 && store.phoneLast4.includes(searchTerm));
        
        // 부서별 담당자 정보 검색
        const departmentMatch = store.departments && store.departments.some(dept =>
          dept.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dept.phoneLast4.includes(searchTerm) ||
          dept.department.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return basicMatch || legacyMatch || departmentMatch;
      });
    }

    // 상태 필터링
    if (filter === '미발급') {
      filtered = filtered.filter(store => {
        if (!store.isActive) return false;
        
        if (store.departments && store.departments.length > 0) {
          return store.departments.some(dept => !dept.accountIssued);
        }
        return !store.accountIssued;
      });
    } else if (filter === '발급완료') {
      filtered = filtered.filter(store => {
        if (!store.isActive) return false;
        
        if (store.departments && store.departments.length > 0) {
          return store.departments.some(dept => dept.accountIssued);
        }
        return store.accountIssued;
      });
    } else if (filter === '비활성') {
      filtered = filtered.filter(store => !store.isActive);
    }

    setFilteredStores(filtered);
    console.log('🔍 필터링 결과:', { searchTerm, filter, count: filtered.length });
  };

  const getStoreIcon = (storeCode) => {
    const hash = storeCode.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = [
      'bg-green-100 text-green-600',
      'bg-blue-100 text-blue-600',
      'bg-orange-100 text-orange-600',
      'bg-purple-100 text-purple-600',
      'bg-indigo-100 text-indigo-600',
      'bg-pink-100 text-pink-600',
      'bg-yellow-100 text-yellow-600',
      'bg-red-100 text-red-600'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const getStatusBadge = (store) => {
    if (!store.isActive) {
      return 'bg-gray-100 text-gray-600';
    } else if (!store.accountIssued) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-600';
    }
  };

  const getStatusText = (store) => {
    if (!store.isActive) {
      return '비활성';
    } else if (!store.accountIssued) {
      return '계정미발급';
    } else {
      return '계정발급완료';
    }
  };

  // 부서별 담당자 정보 렌더링 - HTML 스타일과 동일하게 수정
  const renderDepartmentInfo = (store) => {
    if (store.departments && store.departments.length > 0) {
      return (
        <div className="space-y-3 bg-gradient-to-br from-orange-50 to-orange-50/70 p-4 rounded-xl border border-orange-100 mb-3">
          {store.departments.map((dept, index) => (
            <React.Fragment key={index}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"></div>
                    <p className="font-semibold text-gray-800 text-sm">{dept.department} 매장</p>
                  </div>
                  <p className="text-xs text-gray-600 pl-4">담당자: {dept.managerName}</p>
                  <p className="text-xs text-gray-600 pl-4">연락처: {dept.fullPhone}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                  dept.accountIssued 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {dept.accountIssued ? '계정발급완료' : '계정미발급'}
                </span>
              </div>
              
              {/* 부서 사이 구분선 (마지막 부서가 아닌 경우만) */}
              {index < store.departments.length - 1 && (
                <div className="border-t border-orange-200"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      );
    } else if (store.managerName && store.fullPhone) {
      // 기존 데이터 표시 - 동일한 스타일 적용
      return (
        <div className="space-y-3 bg-gradient-to-br from-orange-50 to-orange-50/70 p-4 rounded-xl border border-orange-100 mb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"></div>
                <p className="font-semibold text-gray-800 text-sm">담당자 정보</p>
              </div>
              <p className="text-xs text-gray-600 pl-4">담당자: {store.managerName}</p>
              <p className="text-xs text-gray-600 pl-4">연락처: {store.fullPhone}</p>
            </div>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
              store.accountIssued 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {store.accountIssued ? '계정발급완료' : '계정미발급'}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderActionButtons = (store) => {
    const storeId = store._id;
    const isProcessing = processingIds.has(storeId);

    if (!store.isActive) {
      // 비활성 매장 - 수정, 활성화 버튼
      return (
        <div className="mt-4 flex gap-2">
          <button 
            className="flex-1 py-2.5 bg-gray-50 text-gray-700 text-sm rounded-xl font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
            onClick={() => {
              setEditingStore(store);
              // 기존 데이터와 새 구조 모두 지원
              if (store.departments && store.departments.length > 0) {
                setFormData({
                  storeCode: store.storeCode,
                  storeName: store.storeName,
                  address: store.address || '',
                  notes: store.notes || '',
                  autoCreateUsers: false, // 수정 시에는 기본적으로 false
                  departments: store.departments.map(dept => ({
                    department: dept.department,
                    managerName: dept.managerName,
                    fullPhone: dept.fullPhone
                  }))
                });
              } else {
                setFormData({
                  storeCode: store.storeCode,
                  storeName: store.storeName,
                  address: store.address || '',
                  notes: store.notes || '',
                  autoCreateUsers: false, // 수정 시에는 기본적으로 false
                  departments: [
                    {
                      department: '여성',
                      managerName: store.managerName || '',
                      fullPhone: store.fullPhone || ''
                    }
                  ]
                });
              }
            }}
          >
            수정
          </button>
          <button
            className="flex-1 py-2.5 bg-green-50 text-green-600 text-sm rounded-xl font-medium border border-green-200 hover:bg-green-100 transition-colors"
            onClick={(e) => handleToggleStoreStatus(storeId, store.isActive, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '활성화'}
          </button>
        </div>
      );
    } else {
      // 활성 매장 - 수정, 비활성화 버튼
      return (
        <div className="mt-4 flex gap-2">
          <button 
            className="flex-1 py-2.5 bg-gray-50 text-gray-700 text-sm rounded-xl font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
            onClick={() => {
              setEditingStore(store);
              // 기존 데이터와 새 구조 모두 지원
              if (store.departments && store.departments.length > 0) {
                setFormData({
                  storeCode: store.storeCode,
                  storeName: store.storeName,
                  address: store.address || '',
                  notes: store.notes || '',
                  autoCreateUsers: false, // 수정 시에는 기본적으로 false
                  departments: store.departments.map(dept => ({
                    department: dept.department,
                    managerName: dept.managerName,
                    fullPhone: dept.fullPhone
                  }))
                });
              } else {
                setFormData({
                  storeCode: store.storeCode,
                  storeName: store.storeName,
                  address: store.address || '',
                  notes: store.notes || '',
                  autoCreateUsers: false, // 수정 시에는 기본적으로 false
                  departments: [
                    {
                      department: '여성',
                      managerName: store.managerName || '',
                      fullPhone: store.fullPhone || ''
                    }
                  ]
                });
              }
            }}
          >
            수정
          </button>
          <button
            className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200 hover:bg-red-100 transition-colors"
            onClick={(e) => handleToggleStoreStatus(storeId, store.isActive, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '비활성화'}
          </button>
        </div>
      );
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🚀 매장 관리 컴포넌트 마운트 - 데이터 로드 시작');
    isMountedRef.current = true;
    fetchAllStores();

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 자동 새로고침 실행');
        fetchAllStores();
      }
    }, 60000);

    return () => {
      console.log('🧹 매장 관리 컴포넌트 언마운트 - 정리 작업');
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gray-100 font-sans">
      <div id="mobile-container" className="w-full max-w-sm mx-auto bg-white shadow-lg min-h-screen">
        
        {/* 에러 표시 (개발용) */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
            <strong className="font-bold">오류: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* 디버깅 정보 (개발용) */}
        <div className="bg-blue-100 p-2 text-xs text-blue-800 m-4 rounded">
          <div>🏪 Stores: 전체 {allStores.length}개, 필터링 {filteredStores.length}개</div>
          <div>📊 Stats: 계정미발급 {stats.notIssued}, 계정발급완료 {stats.issued}, 비활성 {stats.inactive}</div>
          <div>🔍 Filter: "{searchTerm}" / {activeFilter}</div>
          {loading && <div>⏳ 로딩 중...</div>}
        </div>

        {/* Header */}
        <header id="header" className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-4 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 576 512">
                  <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">매장 관리</h1>
                <p className="text-white/80 text-xs">등록된 매장 및 계정 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 매장등록 버튼 - 헤더 오른쪽에 배치 */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                title="새 매장 등록"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 448 512">
                  <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/>
                </svg>
              </button>
              <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 512 512">
                  <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
                </svg>
              </button>
              <img
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg"
                className="w-8 h-8 rounded-lg"
                alt="Admin Avatar"
              />
            </div>
          </div>

          {/* Store Stats */}
          <div id="account-stats" className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">계정미발급</div>
              <div className="text-lg font-bold text-white">{stats.notIssued}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">계정발급완료</div>
              <div className="text-lg font-bold text-white">{stats.issued}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">비활성</div>
              <div className="text-lg font-bold text-white">{stats.inactive}</div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="p-4 pb-20">
          {/* Search & Filter */}
          <div id="search-filter" className="mb-4">
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="매장코드, 매장명, 담당자명으로 검색"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="currentColor" viewBox="0 0 512 512">
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
            </div>
            <div className="flex gap-2">
              {['전체', '미발급', '발급완료', '비활성'].map(filter => (
                <button
                  key={filter}
                  className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                    activeFilter === filter
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleFilterChange(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Store List */}
          <div id="account-list" className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                ⏳ 매장 목록을 불러오는 중...
              </div>
            ) : filteredStores.length > 0 ? filteredStores.map((store, index) => (
              <div key={store._id || index} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 relative overflow-hidden">
                {/* 상단 오렌지 그라데이션 바 */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 576 512">
                        <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{store.storeCode}</h3>
                      <p className="text-sm text-gray-600 font-medium">{store.storeName}</p>
                      {/* 부서 개수 표시 */}
                      {store.departments && store.departments.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {store.departments.length}개 매장 • {store.departments.map(d => d.department).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 text-xs rounded-full font-medium border ${getStatusBadge(store)}`}>
                    {getStatusText(store)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 py-3 border-t border-gray-100 mb-4">
                  <div>
                    <span className="block text-gray-400 mb-1">등록일</span>
                    <span className="text-gray-800 font-medium">
                      {store.createdAt ? new Date(store.createdAt).toLocaleDateString('ko-KR') : '알 수 없음'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-gray-400 mb-1">수정일</span>
                    <span className="text-gray-800 font-medium">
                      {store.updatedAt 
                        ? new Date(store.updatedAt).toLocaleDateString('ko-KR') 
                        : '없음'}
                    </span>
                  </div>
                </div>

                {/* 부서별 담당자 정보 표시 */}
                {renderDepartmentInfo(store)}

                {/* 주소 정보 표시 */}
                {store.address && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <div className="text-xs text-blue-600 font-medium">매장 주소</div>
                    <div className="text-sm text-blue-800">{store.address}</div>
                  </div>
                )}

                {/* 메모 표시 */}
                {store.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="text-xs text-gray-600 font-medium">메모</div>
                    <div className="text-sm text-gray-800">{store.notes}</div>
                  </div>
                )}

                {/* 액션 버튼 */}
                {renderActionButtons(store)}
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">조건에 맞는 매장이 없습니다.</div>
                <small className="text-gray-400 mt-1 block">검색어나 필터를 확인해보세요</small>
              </div>
            )}
          </div>
        </main>

        {/* 매장 추가/수정 모달 - 부서별 담당자 지원 + User 자동 생성 옵션 추가 */}
        {(showAddModal || editingStore) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {editingStore ? '매장 정보 수정' : '새 매장 등록'}
              </h3>
              
              <div className="space-y-4">
                {/* 기본 매장 정보 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장코드 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: ST001"
                    value={formData.storeCode}
                    onChange={(e) => setFormData({ ...formData, storeCode: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장명 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: 강남점"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장 주소</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: 서울시 강남구 테헤란로 123"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* 👈 User 자동 생성 옵션 추가 (새 매장 등록 시만) */}
                {!editingStore && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.autoCreateUsers}
                        onChange={(e) => setFormData({ ...formData, autoCreateUsers: e.target.checked })}
                        className="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-blue-800">
                        매장별 담당자 계정 자동 생성
                      </span>
                    </label>
                    <p className="text-xs text-blue-600 mt-1 ml-6">
                      체크하면 각 매장별로 로그인 계정이 자동으로 생성됩니다.
                    </p>
                  </div>
                )}

                {/* 부서별 담당자 정보 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">매장별 담당자 *</label>
                    {formData.departments.length < 3 && (
                      <button
                        type="button"
                        onClick={addDepartment}
                        className="text-orange-500 hover:text-orange-600 text-sm"
                      >
                        + 담당자 추가
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {formData.departments.map((dept, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <select
                            className="text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none"
                            value={dept.department}
                            onChange={(e) => updateDepartment(index, 'department', e.target.value)}
                          >
                            <option value="여성">여성 매장</option>
                            <option value="남성">남성 매장</option>
                            <option value="슈즈">슈즈 매장</option>
                          </select>
                          {formData.departments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDepartment(index)}
                              className="text-red-500 hover:text-red-600 text-sm"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="담당자명"
                            value={dept.managerName}
                            onChange={(e) => updateDepartment(index, 'managerName', e.target.value)}
                          />
                          <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="010-1234-5678"
                            value={dept.fullPhone}
                            onChange={(e) => updateDepartment(index, 'fullPhone', e.target.value)}
                          />
                        </div>

                        {/* 계정 생성 시 미리보기 */}
                        {formData.autoCreateUsers && !editingStore && dept.managerName && formData.storeCode && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                            <span className="text-green-600">
                              🔑 생성될 계정: {formData.storeCode}_{dept.department}_XXXXXX
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <small className="text-gray-500 text-xs mt-1">
                    {formData.autoCreateUsers && !editingStore 
                      ? '계정이 자동으로 생성되며 임시 비밀번호가 제공됩니다.'
                      : '계정 신청 시 매장별로 검증됩니다'
                    }
                  </small>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="추가 정보나 메모를 입력하세요"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStore(null);
                    resetFormData();
                  }}
                >
                  취소
                </button>
                <button
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  onClick={editingStore ? handleEditStore : handleAddStore}
                >
                  {editingStore ? '수정' : '등록'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <nav id="bottom-nav" className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-1">
            <button
              className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                if (onBackToAdmin) {
                  onBackToAdmin();
                }
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
              </svg>
              <span className="text-xs">홈</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 text-orange-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
              </svg>
              <span className="text-xs">매장관리</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512">
                <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
              </svg>
              <span className="text-xs">설정</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AccountManage;