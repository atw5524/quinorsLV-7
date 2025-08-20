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
  
  // 새 매장 추가/수정 폼 데이터
  const [formData, setFormData] = useState({
    storeCode: '',
    managerName: '',
    phoneNumber: '',
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
      
      const response = await fetch('http://localhost:5480/api/admin/stores');
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
    const notIssued = storeData.filter(store => !store.accountIssued).length;
    const issued = storeData.filter(store => store.accountIssued && store.isActive).length;
    const inactive = storeData.filter(store => !store.isActive).length;
    
    setStats({ total, notIssued, issued, inactive });
    console.log('📊 통계 계산:', { total, notIssued, issued, inactive });
  };

  // 매장 추가
  const handleAddStore = async () => {
    if (!formData.storeCode || !formData.managerName || !formData.phoneNumber) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    try {
      console.log('➕ 매장 추가 시작:', formData);
      
      const response = await fetch('http://localhost:5480/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('➕ 매장 추가 API 응답:', result);
      
      if (response.ok && result.success) {
        alert('매장이 성공적으로 추가되었습니다.');
        setShowAddModal(false);
        setFormData({ storeCode: '', managerName: '', phoneNumber: '', notes: '' });
        await fetchAllStores();
      } else {
        alert(`매장 추가 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('➕ 매장 추가 실패:', error);
      alert('매장 추가 중 오류가 발생했습니다.');
    }
  };

  // 매장 수정
  const handleEditStore = async () => {
    if (!formData.storeCode || !formData.managerName || !formData.phoneNumber) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    try {
      console.log('✏️ 매장 수정 시작:', editingStore._id, formData);
      
      const response = await fetch(`http://localhost:5480/api/admin/stores/${editingStore._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('✏️ 매장 수정 API 응답:', result);
      
      if (response.ok && result.success) {
        alert('매장 정보가 성공적으로 수정되었습니다.');
        setEditingStore(null);
        setFormData({ storeCode: '', managerName: '', phoneNumber: '', notes: '' });
        await fetchAllStores();
      } else {
        alert(`매장 수정 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('✏️ 매장 수정 실패:', error);
      alert('매장 수정 중 오류가 발생했습니다.');
    }
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
      
      const response = await fetch(`http://localhost:5480/api/admin/stores/${storeId}/status`, {
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
              buttonElement.className = 'px-3 py-1 bg-red-100 text-red-600 text-xs rounded-md hover:bg-red-200 transition-colors';
              if (statusBadge) {
                statusBadge.className = getStatusBadge({ isActive: true, accountIssued: true });
                statusBadge.textContent = getStatusText({ isActive: true, accountIssued: true });
              }
            } else {
              buttonElement.innerHTML = '활성화';
              buttonElement.className = 'px-3 py-1 bg-green-100 text-green-600 text-xs rounded-md hover:bg-green-200 transition-colors';
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

  // 계정 강제 발급
  const handleIssueAccount = async (storeId, buttonElement) => {
    try {
      console.log('🎫 계정 발급 시작:', storeId);
      
      if (buttonElement) {
        buttonElement.innerHTML = '발급중...';
        buttonElement.disabled = true;
      }
      
      setProcessingIds(prev => new Set([...prev, storeId]));
      
      const response = await fetch(`http://localhost:5480/api/admin/stores/${storeId}/issue-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: '관리자에 의한 계정 발급'
        }),
      });

      const result = await response.json();
      console.log('🎫 계정 발급 API 응답:', result);
      
      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            buttonElement.innerHTML = '발급완료';
            buttonElement.className = 'px-3 py-1 bg-green-600 text-white text-xs rounded-md';
          }
        }, 1500);
        
        alert(`계정이 발급되었습니다!\n사용자 ID: ${result.data.userId}\n임시 비밀번호: ${result.data.tempPassword}`);
        await fetchAllStores();
      } else {
        alert(`계정 발급 실패: ${result.message}`);
        if (buttonElement) {
          buttonElement.innerHTML = '계정발급';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('🎫 계정 발급 실패:', error);
      alert('계정 발급 중 오류가 발생했습니다.');
      if (buttonElement) {
        buttonElement.innerHTML = '계정발급';
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
      filtered = filtered.filter(store => 
        store.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.storeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.phoneNumber && store.phoneNumber.includes(searchTerm))
      );
    }
    
    // 상태 필터링
    if (filter === '미발급') {
      filtered = filtered.filter(store => !store.accountIssued && store.isActive);
    } else if (filter === '발급완료') {
      filtered = filtered.filter(store => store.accountIssued && store.isActive);
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
      return 'px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full';
    } else if (!store.accountIssued) {
      return 'px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full';
    } else {
      return 'px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full';
    }
  };

  const getStatusText = (store) => {
    if (!store.isActive) {
      return '비활성';
    } else if (!store.accountIssued) {
      return '미발급';
    } else {
      return '발급완료';
    }
  };

  const renderActionButtons = (store) => {
    const storeId = store._id;
    const isProcessing = processingIds.has(storeId);

    if (!store.isActive) {
      // 비활성 매장 - 활성화 버튼만
      return (
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setEditingStore(store);
                    setFormData({
                      storeCode: store.storeCode,
                      managerName: store.managerName,
                      phoneNumber: store.phoneNumber,
                      notes: store.notes || ''
                    });
                  }}>
            수정
          </button>
          <button 
            className="px-4 py-2 bg-green-100 text-green-600 text-sm rounded-lg hover:bg-green-200 transition-colors"
            onClick={(e) => handleToggleStoreStatus(storeId, store.isActive, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '활성화'}
          </button>
        </div>
      );
    } else if (!store.accountIssued) {
      // 미발급 매장 - 수정, 계정발급, 비활성화 버튼
      return (
        <div className="flex gap-1">
          <button className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setEditingStore(store);
                    setFormData({
                      storeCode: store.storeCode,
                      managerName: store.managerName,
                      phoneNumber: store.phoneNumber,
                      notes: store.notes || ''
                    });
                  }}>
            수정
          </button>
          <button 
            className="px-2 py-2 bg-blue-100 text-blue-600 text-xs rounded-lg hover:bg-blue-200 transition-colors"
            onClick={(e) => handleIssueAccount(storeId, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '발급중...' : '계정발급'}
          </button>
          <button 
            className="px-2 py-2 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition-colors"
            onClick={(e) => handleToggleStoreStatus(storeId, store.isActive, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '비활성화'}
          </button>
        </div>
      );
    } else {
      // 발급완료 매장 - 수정, 비활성화 버튼
      return (
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setEditingStore(store);
                    setFormData({
                      storeCode: store.storeCode,
                      managerName: store.managerName,
                      phoneNumber: store.phoneNumber,
                      notes: store.notes || ''
                    });
                  }}>
            수정
          </button>
          <button 
            className="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors"
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
        
        {/* 뒤로가기 버튼 */}
        {onBackToAdmin && (
          <div className="fixed top-4 left-4 z-50">
            <button
              onClick={onBackToAdmin}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors shadow-lg"
              title="신청관리로 돌아가기"
            >
              ← 신청관리
            </button>
          </div>
        )}

        {/* 매장 추가 버튼 */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors shadow-lg"
            title="새 매장 추가"
          >
            + 매장추가
          </button>
        </div>

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
          <div>📊 Stats: 미발급 {stats.notIssued}, 발급완료 {stats.issued}, 비활성 {stats.inactive}</div>
          <div>🔍 Filter: "{searchTerm}" / {activeFilter}</div>
          {loading && <div>⏳ 로딩 중...</div>}
        </div>
        
        {/* Header */}
        <header id="header" className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-4 pt-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                  <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3zM504 312v-64h64c13.3 0 24-10.7 24-24s-10.7-24-24-24h-64v-64c0-13.3-10.7-24-24-24s-24 10.7-24 24v64h-64c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64c0 13.3 10.7 24 24 24s24-10.7 24-24z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">계정 관리</h1>
                <p className="text-white/80 text-xs">매장 및 계정 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <div className="text-white/80 text-xs mb-1">미발급</div>
              <div className="text-lg font-bold text-white">{stats.notIssued}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">발급완료</div>
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
                placeholder="매장명, 담당자명으로 검색" 
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
              <div key={store._id || index} className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStoreIcon(store.storeCode)}`}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                        <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{store.storeCode}</h3>
                      <p className="text-sm text-gray-500">{store.managerName}</p>
                      <p className="text-xs text-gray-400">연락처: ****{store.phoneNumber.slice(-4)}</p>
                    </div>
                  </div>
                  <span className={getStatusBadge(store)}>
                    {getStatusText(store)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-3">
                  <div>
                    <span className="block">등록일</span>
                    <span className="text-gray-800">
                      {store.createdAt ? new Date(store.createdAt).toLocaleDateString('ko-KR') : '알 수 없음'}
                    </span>
                  </div>
                  <div>
                    <span className="block">계정발급일</span>
                    <span className="text-gray-800">
                      {store.accountIssuedDate 
                        ? new Date(store.accountIssuedDate).toLocaleDateString('ko-KR')
                        : store.accountIssued ? '발급완료' : '미발급'}
                    </span>
                  </div>
                </div>

                {/* 발급된 계정 정보 표시 */}
                {store.accountIssued && store.generatedUserId && (
                  <div className="bg-green-50 p-3 rounded-lg mb-3">
                    <div className="text-xs text-green-600 font-medium">발급된 계정 정보</div>
                    <div className="text-sm text-green-800">ID: {store.generatedUserId}</div>
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

        {/* 매장 추가/수정 모달 */}
        {(showAddModal || editingStore) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {editingStore ? '매장 정보 수정' : '새 매장 추가'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장코드 *</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: ST001"
                    value={formData.storeCode}
                    onChange={(e) => setFormData({...formData, storeCode: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자명 *</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: 김매니저"
                    value={formData.managerName}
                    onChange={(e) => setFormData({...formData, managerName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input 
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="예: 010-1234-5678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="추가 정보나 메모를 입력하세요"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStore(null);
                    setFormData({ storeCode: '', managerName: '', phoneNumber: '', notes: '' });
                  }}
                >
                  취소
                </button>
                <button 
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  onClick={editingStore ? handleEditStore : handleAddStore}
                >
                  {editingStore ? '수정' : '추가'}
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
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 640 512">
                <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
              </svg>
              <span className="text-xs">계정관리</span>
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