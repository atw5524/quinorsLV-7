import React, { useState, useEffect, useRef } from 'react';

const UserManage = ({ onBackToAdmin, onNavigateToTab }) => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    recentLogin: 0
  });
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // 회원 정보 수정 폼 데이터
  const [formData, setFormData] = useState({
    user_id: '',
    cust_name: '',
    charge_name: '',
    tel_no: '',
    dept_name: '',
    dong_name: '',
    dong_detail: '',
    notes: ''
  });

  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);

  // API 호출 함수들
  const fetchAllUsers = async () => {
    try {
      console.log('👥 승인된 회원 목록 API 호출 시작...');
      setLoading(true);
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/users');
      const result = await response.json();
      console.log('👥 승인된 회원 목록 API 응답:', result);

      if (response.ok && result.success) {
        const users = result.data || [];
        console.log('👥 ✅ 승인된 회원 목록 데이터 처리 성공:', users);
        
        if (isMountedRef.current) {
          setAllUsers(users);
          setFilteredUsers(users);
          calculateStats(users);
          setError(null);
        }
      } else {
        console.error('👥 ❌ 승인된 회원 목록 API 실패');
        setError('승인된 회원 목록 조회 실패');
        if (isMountedRef.current) {
          setAllUsers([]);
          setFilteredUsers([]);
        }
      }
    } catch (error) {
      console.error('👥 ❌ 승인된 회원 목록 조회 네트워크 오류:', error);
      setError('승인된 회원 목록 조회 중 네트워크 오류: ' + error.message);
      if (isMountedRef.current) {
        setAllUsers([]);
        setFilteredUsers([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const calculateStats = (userData) => {
    const total = userData.length;
    const active = userData.filter(user => user.isActive !== false).length;
    const inactive = userData.filter(user => user.isActive === false).length;
    
    // 최근 7일 내 로그인한 사용자
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentLogin = userData.filter(user => 
      user.lastLoginAt && new Date(user.lastLoginAt) > weekAgo
    ).length;

    setStats({ total, active, inactive, recentLogin });
    console.log('📊 회원 통계 계산:', { total, active, inactive, recentLogin });
  };

  // 회원정보 수정
  const handleEditUser = async () => {
    // 기본 정보 검증
    if (!formData.charge_name || !formData.tel_no) {
      alert('담당자명과 연락처는 필수 입력 항목입니다.');
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.tel_no)) {
      alert('올바른 휴대폰 번호 형식으로 입력해주세요. (010-0000-0000)');
      return;
    }

    try {
      console.log('✏️ 회원정보 수정 시작:', editingUser._id, formData);

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cust_name: formData.cust_name.trim(),
          charge_name: formData.charge_name.trim(),
          tel_no: formData.tel_no.replace(/[^0-9]/g, ''),
          dept_name: formData.dept_name.trim(),
          dong_name: formData.dong_name.trim(),
          dong_detail: formData.dong_detail.trim(),
          notes: formData.notes.trim()
        }),
      });

      const result = await response.json();
      console.log('✏️ 회원정보 수정 API 응답:', result);

      if (response.ok && result.success) {
        alert('회원정보가 성공적으로 수정되었습니다.');
        setEditingUser(null);
        resetFormData();
        await fetchAllUsers();
      } else {
        alert(`회원정보 수정 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('✏️ 회원정보 수정 실패:', error);
      alert('회원정보 수정 중 오류가 발생했습니다.');
    }
  };

  // 계정 활성화/비활성화
  const handleToggleUserStatus = async (userId, currentStatus, buttonElement) => {
    if (!isMountedRef.current) return;

    try {
      const newStatus = !currentStatus;
      console.log(`🔄 계정 상태 변경 시작: ${userId}, ${currentStatus} -> ${newStatus}`);

      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }

      setProcessingIds(prev => new Set([...prev, userId]));

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/users/${userId}/status`, {
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
      console.log('🔄 계정 상태 변경 API 응답:', result);

      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-white');
            const statusBadge = parentCard.querySelector('span[class*="rounded-full"]');

            if (newStatus) {
              buttonElement.innerHTML = '비활성화';
              buttonElement.className = 'flex-1 py-2.5 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200 hover:bg-red-100 transition-colors';
              if (statusBadge) {
                statusBadge.className = 'px-3 py-1.5 text-xs rounded-full font-medium border bg-green-100 text-green-600';
                statusBadge.textContent = '활성';
              }
            } else {
              buttonElement.innerHTML = '활성화';
              buttonElement.className = 'flex-1 py-2.5 bg-green-50 text-green-600 text-sm rounded-xl font-medium border border-green-200 hover:bg-green-100 transition-colors';
              if (statusBadge) {
                statusBadge.className = 'px-3 py-1.5 text-xs rounded-full font-medium border bg-gray-100 text-gray-600';
                statusBadge.textContent = '비활성';
              }
            }
            buttonElement.disabled = false;
          }
        }, 1500);

        await fetchAllUsers();
      } else {
        console.error('🔄 계정 상태 변경 실패:', result);
        alert(`상태 변경 실패: ${result.message}`);
        if (buttonElement) {
          buttonElement.innerHTML = currentStatus ? '비활성화' : '활성화';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('🔄 계정 상태 변경 중 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
      if (buttonElement) {
        buttonElement.innerHTML = currentStatus ? '비활성화' : '활성화';
        buttonElement.disabled = false;
      }
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // 비밀번호 초기화
  const handleResetPassword = async (userId, userName) => {
    if (!confirm(`${userName}님의 비밀번호를 초기화하시겠습니까?\n\n새로운 임시 비밀번호가 생성됩니다.`)) {
      return;
    }

    try {
      console.log('🔑 비밀번호 초기화 시작:', userId);

      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('🔑 비밀번호 초기화 API 응답:', result);

      if (response.ok && result.success) {
        alert(`🔑 비밀번호가 초기화되었습니다.\n\n새로운 임시 비밀번호: ${result.data.tempPassword}\n\n⚠️ 임시 비밀번호를 사용자에게 안전하게 전달해주세요.`);
      } else {
        alert(`비밀번호 초기화 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('🔑 비밀번호 초기화 실패:', error);
      alert('비밀번호 초기화 중 오류가 발생했습니다.');
    }
  };

  // 폼 데이터 리셋
  const resetFormData = () => {
    setFormData({
      user_id: '',
      cust_name: '',
      charge_name: '',
      tel_no: '',
      dept_name: '',
      dong_name: '',
      dong_detail: '',
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
      tel_no: formattedValue
    }));
  };

  // 검색 및 필터링
  const handleSearch = (term) => {
    setSearchTerm(term);
    filterUsers(term, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterUsers(searchTerm, filter);
  };

  const filterUsers = (searchTerm, filter) => {
    let filtered = [...allUsers];

    // 검색 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.cust_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.charge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.dept_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터링
    if (filter === '활성') {
      filtered = filtered.filter(user => user.isActive !== false);
    } else if (filter === '비활성') {
      filtered = filtered.filter(user => user.isActive === false);
    }

    setFilteredUsers(filtered);
    console.log('🔍 필터링 결과:', { searchTerm, filter, count: filtered.length });
  };

  // 상태별 뱃지 스타일
  const getStatusBadge = (isActive) => {
    return isActive !== false
      ? 'bg-green-100 text-green-600'
      : 'bg-gray-100 text-gray-600';
  };

  // 상태별 텍스트
  const getStatusText = (isActive) => {
    return isActive !== false ? '활성' : '비활성';
  };

  // 매장명과 부서 분리 함수
  const parseStoreName = (custName) => {
    const parts = custName.split(' ');
    if (parts.length >= 2) {
      const department = parts[parts.length - 1];
      const storeName = parts.slice(0, -1).join(' ');
      return { storeName, department };
    }
    return { storeName: custName, department: '' };
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

  // 최근 로그인 시간 계산
  const getLastLoginText = (lastLoginAt) => {
    if (!lastLoginAt) return '로그인 기록 없음';
    
    try {
      const now = new Date();
      const loginDate = new Date(lastLoginAt);
      const diffMs = now - loginDate;
      const diffDays = Math.floor(diffMs / 86400000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;
      return loginDate.toLocaleDateString('ko-KR');
    } catch (error) {
      return '알 수 없음';
    }
  };

  // 액션 버튼 렌더링
  const renderActionButtons = (user) => {
    const userId = user._id;
    const isProcessing = processingIds.has(userId);
    const isActive = user.isActive !== false;

    return (
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 py-2.5 bg-blue-50 text-blue-600 text-sm rounded-xl font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
          onClick={() => {
            setEditingUser(user);
            setFormData({
              user_id: user.user_id,
              cust_name: user.cust_name,
              charge_name: user.charge_name,
              tel_no: user.tel_no ? user.tel_no.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '',
              dept_name: user.dept_name,
              dong_name: user.dong_name || '',
              dong_detail: user.dong_detail || '',
              notes: user.notes || ''
            });
            setShowEditModal(true);
          }}
        >
          정보수정
        </button>
        <button
          className={`flex-1 py-2.5 text-sm rounded-xl font-medium border transition-colors ${
            isActive
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
          }`}
          onClick={(e) => handleToggleUserStatus(userId, isActive, e.target)}
          disabled={isProcessing}
        >
          {isProcessing ? '처리중...' : (isActive ? '비활성화' : '활성화')}
        </button>
        <button
          className="px-3 py-2.5 bg-yellow-50 text-yellow-600 text-sm rounded-xl font-medium border border-yellow-200 hover:bg-yellow-100 transition-colors"
          onClick={() => handleResetPassword(userId, user.charge_name)}
          title="비밀번호 초기화"
        >
          🔑
        </button>
      </div>
    );
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🚀 회원 관리 컴포넌트 마운트 - 데이터 로드 시작');
    isMountedRef.current = true;
    fetchAllUsers();

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 자동 새로고침 실행');
        fetchAllUsers();
      }
    }, 60000);

    return () => {
      console.log('🧹 회원 관리 컴포넌트 언마운트 - 정리 작업');
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
          <div>👥 회원: 전체 {allUsers.length}명, 필터링 {filteredUsers.length}명</div>
          <div>📊 Stats: 활성 {stats.active}, 비활성 {stats.inactive}, 최근접속 {stats.recentLogin}</div>
          <div>🔍 Filter: "{searchTerm}" / {activeFilter}</div>
          {loading && <div>⏳ 로딩 중...</div>}
        </div>

        {/* Header */}
        <header id="header" className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-4 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                  <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">회원 관리</h1>
                <p className="text-white/80 text-xs">승인된 회원 정보 관리</p>
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

          {/* User Stats */}
          <div id="user-stats" className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">활성 회원</div>
              <div className="text-lg font-bold text-white">{stats.active}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">비활성</div>
              <div className="text-lg font-bold text-white">{stats.inactive}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">최근접속</div>
              <div className="text-lg font-bold text-white">{stats.recentLogin}</div>
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
                placeholder="아이디, 매장명, 담당자명, 매장코드로 검색"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="currentColor" viewBox="0 0 512 512">
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
            </div>
            <div className="flex gap-2">
              {['전체', '활성', '비활성'].map(filter => (
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

          {/* User List */}
          <div id="user-list" className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                ⏳ 회원 목록을 불러오는 중...
              </div>
            ) : filteredUsers.length > 0 ? filteredUsers.map((user, index) => {
              const { storeName, department } = parseStoreName(user.cust_name);
              
              return (
                <div key={user._id || index} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 relative overflow-hidden">
                  
                  {/* 상단 오렌지 그라데이션 바 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                          <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{user.user_id}</h3>
                        <p className="text-sm text-gray-600 font-medium">{user.charge_name}</p>
                        <p className="text-xs text-gray-400">
                          가입: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 text-xs rounded-full font-medium border ${getStatusBadge(user.isActive)}`}>
                      {getStatusText(user.isActive)}
                    </span>
                  </div>

                  {/* 회원 정보 */}
                  <div className="space-y-3 bg-gradient-to-br from-orange-50 to-orange-50/70 p-4 rounded-xl border border-orange-100 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getDepartmentIcon(department)}</span>
                      <p className="font-semibold text-gray-800 text-sm">{storeName} {department}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">매장코드</span>
                        <p className="font-medium text-gray-800">{user.dept_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">연락처</span>
                        <p className="font-medium text-gray-800">
                          {user.tel_no ? user.tel_no.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '정보 없음'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 주소 정보 */}
                  {user.dong_name && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-blue-600 font-medium">주소</div>
                      <div className="text-sm text-blue-800">{user.dong_name}</div>
                      {user.dong_detail && (
                        <div className="text-sm text-blue-700 mt-1">{user.dong_detail}</div>
                      )}
                    </div>
                  )}

                  {/* 로그인 정보 */}
                  <div className="bg-purple-50 p-3 rounded-lg mb-3">
                    <div className="text-xs text-purple-600 font-medium">로그인 정보</div>
                    <div className="text-sm text-purple-800">
                      최근 접속: {getLastLoginText(user.lastLoginAt)}
                    </div>
                  </div>

                  {/* 메모 (있는 경우) */}
                  {user.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-gray-600 font-medium">메모</div>
                      <div className="text-sm text-gray-800">{user.notes}</div>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  {renderActionButtons(user)}
                </div>
              );
            }) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">조건에 맞는 회원이 없습니다.</div>
                <small className="text-gray-400 mt-1 block">검색어나 필터를 확인해보세요</small>
              </div>
            )}
          </div>
        </main>

        {/* 회원정보 수정 모달 */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">회원정보 수정</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetFormData();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* 아이디 (읽기 전용) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                    value={formData.user_id}
                    readOnly
                  />
                </div>

                {/* 매장명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장명</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.cust_name}
                    onChange={(e) => setFormData({ ...formData, cust_name: e.target.value })}
                  />
                </div>

                {/* 담당자명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자명 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.charge_name}
                    onChange={(e) => setFormData({ ...formData, charge_name: e.target.value })}
                  />
                </div>

                {/* 연락처 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="010-0000-0000"
                    value={formData.tel_no}
                    onChange={handlePhoneInput}
                    maxLength="13"
                  />
                </div>

                {/* 매장코드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장코드</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.dept_name}
                    onChange={(e) => setFormData({ ...formData, dept_name: e.target.value.toUpperCase() })}
                  />
                </div>

                {/* 주소 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    value={formData.dong_name}
                    onChange={(e) => setFormData({ ...formData, dong_name: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="상세주소"
                    value={formData.dong_detail}
                    onChange={(e) => setFormData({ ...formData, dong_detail: e.target.value })}
                  />
                </div>

                {/* 메모 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="추가 정보나 메모"
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
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetFormData();
                  }}
                >
                  취소
                </button>
                <button
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  onClick={handleEditUser}
                >
                  수정
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
            <button 
              className="flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                if (onNavigateToTab) {
                  onNavigateToTab('store-manage');
                } else if (onBackToAdmin) {
                  onBackToAdmin();
                }
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                <path d="M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z"/>
              </svg>
              <span className="text-xs">매장관리</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 text-orange-500">
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

export default UserManage;