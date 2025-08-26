import React, { useState, useEffect, useRef } from 'react';

const StoreManage = ({ onBackToAdmin, onNavigateToTab }) => {
  const [stats, setStats] = useState({
    totalStores: 0,
    totalDepartments: 0,
    totalManagers: 0,
    activeStores: 0
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

  // 새 매장/부서 추가/수정 폼 데이터
  const [formData, setFormData] = useState({
    storeName: '',
    department: '여성',
    storeCode: '',
    address: '',
    managerName: '',
    managerPhone: '',
    notes: ''
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
    const totalDepartments = storeData.length;
    const uniqueStores = [...new Set(storeData.map(store => store.storeName))];
    const totalStores = uniqueStores.length;
    const totalManagers = storeData.filter(store => store.managerName).length;
    const activeStores = storeData.filter(store => store.isActive !== false).length;

    setStats({ totalStores, totalDepartments, totalManagers, activeStores });
    console.log('📊 통계 계산:', { totalStores, totalDepartments, totalManagers, activeStores });
  };

  // 매장/부서 추가
  const handleAddStore = async () => {
    // 기본 정보 검증
    if (!formData.storeName || !formData.storeCode || !formData.managerName || !formData.managerPhone) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.managerPhone)) {
      alert('올바른 휴대폰 번호 형식으로 입력해주세요. (010-0000-0000)');
      return;
    }

    try {
      console.log('➕ 매장/부서 추가 시작:', formData);

      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: formData.storeName.trim(),
          department: formData.department,
          storeCode: formData.storeCode.trim().toUpperCase(),
          address: formData.address.trim(),
          managerName: formData.managerName.trim(),
          managerPhone: formData.managerPhone.replace(/[^0-9]/g, ''),
          notes: formData.notes.trim()
        }),
      });

      const result = await response.json();
      console.log('➕ 매장/부서 추가 API 응답:', result);

      if (response.ok && result.success) {
        alert('매장/부서가 성공적으로 등록되었습니다.');
        setShowAddModal(false);
        resetFormData();
        await fetchAllStores();
      } else {
        alert(`매장/부서 등록 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('➕ 매장/부서 등록 실패:', error);
      alert('매장/부서 등록 중 오류가 발생했습니다.');
    }
  };

  // 매장/부서 수정
  const handleEditStore = async () => {
    if (!formData.storeName || !formData.storeCode || !formData.managerName || !formData.managerPhone) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.managerPhone)) {
      alert('올바른 휴대폰 번호 형식으로 입력해주세요. (010-0000-0000)');
      return;
    }

    try {
      console.log('✏️ 매장/부서 수정 시작:', editingStore._id, formData);

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/stores/${editingStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: formData.storeName.trim(),
          department: formData.department,
          storeCode: formData.storeCode.trim().toUpperCase(),
          address: formData.address.trim(),
          managerName: formData.managerName.trim(),
          managerPhone: formData.managerPhone.replace(/[^0-9]/g, ''),
          notes: formData.notes.trim()
        }),
      });

      const result = await response.json();
      console.log('✏️ 매장/부서 수정 API 응답:', result);

      if (response.ok && result.success) {
        alert('매장/부서 정보가 성공적으로 수정되었습니다.');
        setEditingStore(null);
        resetFormData();
        await fetchAllStores();
      } else {
        alert(`매장/부서 수정 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('✏️ 매장/부서 수정 실패:', error);
      alert('매장/부서 수정 중 오류가 발생했습니다.');
    }
  };

  // 매장/부서 삭제
  const handleDeleteStore = async (storeId, storeName, department) => {
    if (!confirm(`${storeName} ${department} 부서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      console.log('🗑️ 매장/부서 삭제 시작:', storeId);

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/stores/${storeId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('🗑️ 매장/부서 삭제 API 응답:', result);

      if (response.ok && result.success) {
        alert('매장/부서가 성공적으로 삭제되었습니다.');
        await fetchAllStores();
      } else {
        alert(`매장/부서 삭제 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('🗑️ 매장/부서 삭제 실패:', error);
      alert('매장/부서 삭제 중 오류가 발생했습니다.');
    }
  };

  // 폼 데이터 리셋
  const resetFormData = () => {
    setFormData({
      storeName: '',
      department: '여성',
      storeCode: '',
      address: '',
      managerName: '',
      managerPhone: '',
      notes: ''
    });
  };

  // 전화번호 포맷팅
  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = value;
    
    if (value.length <= 3) {
      formattedValue = value;
    } else if (value.length <= 7) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length <= 11) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
    }
    
    setFormData(prev => ({
      ...prev,
      managerPhone: formattedValue
    }));
  };

  // 매장코드 입력 처리
  const handleStoreCodeInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      storeCode: value
    }));
  };

  // 검색 및 필터링
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
      filtered = filtered.filter(store =>
        store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.storeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 부서 필터링
    if (filter === '여성') {
      filtered = filtered.filter(store => store.department === '여성');
    } else if (filter === '남성') {
      filtered = filtered.filter(store => store.department === '남성');
    } else if (filter === '슈즈') {
      filtered = filtered.filter(store => store.department === '슈즈');
    }

    setFilteredStores(filtered);
    console.log('🔍 필터링 결과:', { searchTerm, filter, count: filtered.length });
  };

  // 부서별 아이콘
  const getDepartmentIcon = (department) => {
    const icons = {
      '여성': '👗',
      '남성': '👔',
      '슈즈': '👟'
    };
    return icons[department] || '🏪';
  };

  // 부서별 색상
  const getDepartmentColor = (department) => {
    const colors = {
      '여성': 'bg-pink-100 text-pink-600',
      '남성': 'bg-blue-100 text-blue-600',
      '슈즈': 'bg-green-100 text-green-600'
    };
    return colors[department] || 'bg-gray-100 text-gray-600';
  };

  // 매장별 그룹핑 함수
  const groupStoresByName = (stores) => {
    const grouped = {};
    stores.forEach(store => {
      if (!grouped[store.storeName]) {
        grouped[store.storeName] = {
          storeName: store.storeName,
          address: store.address,
          departments: []
        };
      }
      grouped[store.storeName].departments.push(store);
    });
    return Object.values(grouped);
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

  const groupedStores = groupStoresByName(filteredStores);

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
          <div>🏪 매장: {stats.totalStores}개 지점, {stats.totalDepartments}개 부서</div>
          <div>👥 담당자: {stats.totalManagers}명, 활성: {stats.activeStores}개</div>
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
                <p className="text-white/80 text-xs">매장별 부서 및 담당자 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 매장/부서 등록 버튼 */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                title="새 매장/부서 등록"
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
          <div id="store-stats" className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">매장 수</div>
              <div className="text-lg font-bold text-white">{stats.totalStores}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">부서 수</div>
              <div className="text-lg font-bold text-white">{stats.totalDepartments}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">담당자</div>
              <div className="text-lg font-bold text-white">{stats.totalManagers}</div>
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
                placeholder="매장명, 매장코드, 담당자명으로 검색"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="currentColor" viewBox="0 0 512 512">
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
            </div>
            <div className="flex gap-2">
              {['전체', '여성', '남성', '슈즈'].map(filter => (
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
          <div id="store-list" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                ⏳ 매장 목록을 불러오는 중...
              </div>
            ) : groupedStores.length > 0 ? groupedStores.map((storeGroup, groupIndex) => (
              <div key={`${storeGroup.storeName}-${groupIndex}`} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 relative overflow-hidden">
                
                {/* 상단 오렌지 그라데이션 바 */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                
                {/* 매장 정보 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 576 512">
                        <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{storeGroup.storeName}</h3>
                      <p className="text-sm text-gray-600">{storeGroup.departments.length}개 부서</p>
                    </div>
                  </div>
                </div>

                {/* 주소 정보 */}
                {storeGroup.address && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="text-xs text-blue-600 font-medium">매장 주소</div>
                    <div className="text-sm text-blue-800">{storeGroup.address}</div>
                  </div>
                )}

                {/* 부서별 정보 */}
                <div className="space-y-3">
                  {storeGroup.departments.map((dept, deptIndex) => (
                    <div key={`${dept._id}-${deptIndex}`} className="bg-gradient-to-br from-orange-50 to-orange-50/70 p-4 rounded-xl border border-orange-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getDepartmentIcon(dept.department)}</span>
                            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${getDepartmentColor(dept.department)}`}>
                              {dept.department}
                            </span>
                            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-700">
                              {dept.storeCode}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">담당자: {dept.managerName}</p>
                          <p className="text-sm text-gray-600">연락처: {dept.managerPhone ? 
                            dept.managerPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : 
                            '정보 없음'
                          }</p>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => {
                              setEditingStore(dept);
                              setFormData({
                                storeName: storeGroup.storeName,
                                department: dept.department,
                                storeCode: dept.storeCode,
                                address: storeGroup.address || '',
                                managerName: dept.managerName,
                                managerPhone: dept.managerPhone ? 
                                  dept.managerPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '',
                                notes: dept.notes || ''
                              });
                            }}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteStore(dept._id, storeGroup.storeName, dept.department)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      
                      {/* 메모 표시 */}
                      {dept.notes && (
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <div className="text-xs text-orange-600 font-medium">메모</div>
                          <div className="text-sm text-orange-800">{dept.notes}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">조건에 맞는 매장이 없습니다.</div>
                <small className="text-gray-400 mt-1 block">검색어나 필터를 확인해보세요</small>
              </div>
            )}
          </div>
        </main>

        {/* 매장/부서 추가/수정 모달 */}
        {(showAddModal || editingStore) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {editingStore ? '매장/부서 정보 수정' : '새 매장/부서 등록'}
              </h3>

              <div className="space-y-4">
                {/* 매장명 */}
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

                {/* 부서 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서 *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="여성">👗 여성</option>
                    <option value="남성">👔 남성</option>
                    <option value="슈즈">👟 슈즈</option>
                  </select>
                </div>

                {/* 매장코드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장코드 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: ST001W"
                    value={formData.storeCode}
                    onChange={handleStoreCodeInput}
                    maxLength="20"
                  />
                </div>

                {/* 주소 */}
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

                {/* 담당자명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자명 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="담당자 이름"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  />
                </div>

                {/* 담당자 연락처 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 연락처 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="010-0000-0000"
                    value={formData.managerPhone}
                    onChange={handlePhoneInput}
                    maxLength="13"
                  />
                </div>

                {/* 메모 */}
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

        {/* Bottom Navigation - 4개 탭 통일 */}
        <nav id="bottom-nav" className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-1">
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
            <button 
              className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('account-requests');
                } else if (onBackToAdmin) {
                  onBackToAdmin();
                }
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 640 512">
                <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
              </svg>
              <span className="text-xs">가입신청</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 text-orange-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
              </svg>
              <span className="text-xs">매장관리</span>
            </button>
            <button 
              className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('user-manage');
                } else if (onBackToAdmin) {
                  onBackToAdmin();
                }
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 640 512">
                <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z"/>
              </svg>
              <span className="text-xs">회원관리</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default StoreManage;