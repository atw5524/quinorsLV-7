import React, { useState, useEffect, useRef } from 'react';

const AccountManage = ({ onBackToAdmin, onNavigateToTab, token }) => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [allRequests, setAllRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);

  // 인증 헤더 생성 함수
  const getAuthHeaders = () => {
    if (!token) {
      throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // API 호출 함수들
  const fetchAllRequests = async () => {
    try {
      console.log('📋 가입신청 목록 API 호출 시작...');
      setLoading(true);
      
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/admin/requests', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const result = await response.json();
      console.log('📋 가입신청 목록 API 응답:', result);
      
      if (response.ok && result.success) {
        const requests = result.data || [];
        console.log('📋 ✅ 가입신청 목록 데이터 처리 성공:', requests);
        
        if (isMountedRef.current) {
          setAllRequests(requests);
          setFilteredRequests(requests);
          calculateStats(requests);
          setError(null);
        }
      } else {
        console.error('📋 ❌ 가입신청 목록 API 실패');
        if (response.status === 401) {
          setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        } else if (response.status === 403) {
          setError('관리자 권한이 필요합니다.');
        } else {
          setError('가입신청 목록 조회 실패');
        }
        if (isMountedRef.current) {
          setAllRequests([]);
          setFilteredRequests([]);
        }
      }
    } catch (error) {
      console.error('📋 ❌ 가입신청 목록 조회 네트워크 오류:', error);
      setError('가입신청 목록 조회 중 네트워크 오류: ' + error.message);
      if (isMountedRef.current) {
        setAllRequests([]);
        setFilteredRequests([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const calculateStats = (requestData) => {
    const total = requestData.length;
    const pending = requestData.filter(req => req.status === 'pending').length;
    const approved = requestData.filter(req => req.status === 'approved').length;
    const rejected = requestData.filter(req => req.status === 'rejected').length;

    setStats({ total, pending, approved, rejected });
    console.log('📊 통계 계산:', { total, pending, approved, rejected });
  };

  // 승인 처리
  const handleApprove = async (requestId, buttonElement) => {
    if (!isMountedRef.current) return;

    try {
      console.log('✅ 승인 처리 시작:', requestId);
      
      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }
      setProcessingIds(prev => new Set([...prev, requestId]));
      
      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/requests/${requestId}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          notes: '관리자 승인 완료'
        }),
      });

      const result = await response.json();
      console.log('✅ 승인 API 응답:', result);
      
      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-white');
            if (parentCard) {
              parentCard.style.opacity = '0.7';
            }
            buttonElement.innerHTML = '승인완료';
            buttonElement.className = 'flex-1 py-2.5 bg-green-600 text-white text-sm rounded-xl font-medium';
          }
        }, 1500);

        let message = '✅ 가입신청이 승인되었습니다!';
        if (result.data && result.data.userId && result.data.tempPassword) {
          message += `\n\n📋 생성된 계정 정보:\n• 사용자 ID: ${result.data.userId}\n• 임시 비밀번호: ${result.data.tempPassword}\n\n⚠️ 임시 비밀번호를 신청자에게 안전하게 전달해주세요.`;
        }
        alert(message);
        await fetchAllRequests();
      } else {
        console.error('✅ 승인 실패:', result);
        alert(`승인 실패: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
        if (buttonElement) {
          buttonElement.innerHTML = '승인';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('✅ 승인 처리 실패:', error);
      alert('승인 처리 중 오류가 발생했습니다.\n네트워크 연결을 확인해주세요.');
      if (buttonElement) {
        buttonElement.innerHTML = '승인';
        buttonElement.disabled = false;
      }
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // 반려 처리
  const handleReject = async (requestId, buttonElement) => {
    if (!isMountedRef.current) return;

    try {
      const notes = prompt('반려 사유를 입력해주세요:', '서류 미비 또는 정보 불일치');
      if (!notes) return;

      console.log('❌ 반려 처리 시작:', requestId);
      
      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }
      setProcessingIds(prev => new Set([...prev, requestId]));
      
      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
      });

      const result = await response.json();
      console.log('❌ 반려 API 응답:', result);
      
      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-white');
            if (parentCard) {
              parentCard.style.opacity = '0.7';
            }
            buttonElement.innerHTML = '반려완료';
            buttonElement.className = 'flex-1 py-2.5 bg-red-500 text-white text-sm rounded-xl font-medium';
          }
        }, 1500);

        alert(`❌ 가입신청이 반려되었습니다.\n반려 사유: ${notes}`);
        await fetchAllRequests();
      } else {
        console.error('❌ 반려 실패:', result);
        alert(`반려 실패: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
        if (buttonElement) {
          buttonElement.innerHTML = '반려';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('❌ 반려 처리 실패:', error);
      alert('반려 처리 중 오류가 발생했습니다.\n네트워크 연결을 확인해주세요.');
      if (buttonElement) {
        buttonElement.innerHTML = '반려';
        buttonElement.disabled = false;
      }
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // 검색 및 필터링
  const handleSearch = (term) => {
    setSearchTerm(term);
    filterRequests(term, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterRequests(searchTerm, filter);
  };

  const filterRequests = (searchTerm, filter) => {
    let filtered = [...allRequests];

    // 검색 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(request =>
        request.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.cust_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.charge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.dept_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터링
    if (filter === '대기') {
      filtered = filtered.filter(request => request.status === 'pending');
    } else if (filter === '승인') {
      filtered = filtered.filter(request => request.status === 'approved');
    } else if (filter === '반려') {
      filtered = filtered.filter(request => request.status === 'rejected');
    }

    setFilteredRequests(filtered);
    console.log('🔍 필터링 결과:', { searchTerm, filter, count: filtered.length });
  };

  // 상태별 뱃지 스타일
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'rejected':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // 상태별 텍스트
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '승인 대기';
      case 'approved':
        return '승인 완료';
      case 'rejected':
        return '반려';
      default:
        return '알 수 없음';
    }
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

  // 액션 버튼 렌더링
  const renderActionButtons = (request) => {
    const requestId = request._id;
    const isProcessing = processingIds.has(requestId);

    if (request.status === 'pending') {
      return (
        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 py-2.5 bg-green-50 text-green-600 text-sm rounded-xl font-medium border border-green-200 hover:bg-green-100 transition-colors"
            onClick={(e) => handleApprove(requestId, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '승인'}
          </button>
          <button
            className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200 hover:bg-red-100 transition-colors"
            onClick={(e) => handleReject(requestId, e.target)}
            disabled={isProcessing}
          >
            {isProcessing ? '처리중...' : '반려'}
          </button>
        </div>
      );
    } else {
      return (
        <div className="mt-4">
          <button
            className="w-full py-2.5 bg-gray-50 text-gray-700 text-sm rounded-xl font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
            onClick={() => {
              setSelectedRequest(request);
              setShowDetailModal(true);
            }}
          >
            상세보기
          </button>
        </div>
      );
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (!token) {
      setError('인증 토큰이 없습니다. 다시 로그인해주세요.');
      return;
    }

    console.log('🚀 가입신청 관리 컴포넌트 마운트 - 데이터 로드 시작');
    isMountedRef.current = true;
    fetchAllRequests();

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 자동 새로고침 실행');
        fetchAllRequests();
      }
    }, 60000);

    return () => {
      console.log('🧹 가입신청 관리 컴포넌트 언마운트 - 정리 작업');
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

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
          <div>📋 신청: 전체 {allRequests.length}개, 필터링 {filteredRequests.length}개</div>
          <div>📊 Stats: 대기 {stats.pending}, 승인 {stats.approved}, 반려 {stats.rejected}</div>
          <div>🔍 Filter: "{searchTerm}" / {activeFilter}</div>
          {loading && <div>⏳ 로딩 중...</div>}
        </div>

        {/* Header */}
        <header id="header" className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-4 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                  <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">가입신청 관리</h1>
                <p className="text-white/80 text-xs">회원가입 신청 승인/반려 처리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 512 512">
                  <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Request Stats */}
          <div id="request-stats" className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">승인 대기</div>
              <div className="text-lg font-bold text-white">{stats.pending}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">승인 완료</div>
              <div className="text-lg font-bold text-white">{stats.approved}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-white/80 text-xs mb-1">반려</div>
              <div className="text-lg font-bold text-white">{stats.rejected}</div>
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
              {['전체', '대기', '승인', '반려'].map(filter => (
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

          {/* Request List */}
          <div id="request-list" className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                ⏳ 가입신청 목록을 불러오는 중...
              </div>
            ) : filteredRequests.length > 0 ? filteredRequests.map((request, index) => {
              const { storeName, department } = parseStoreName(request.cust_name);
              
              return (
                <div key={request._id || index} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 relative overflow-hidden">
                  
                  {/* 상단 오렌지 그라데이션 바 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                          <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{request.user_id}</h3>
                        <p className="text-sm text-gray-600 font-medium">{request.charge_name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(request.createdAt).toLocaleString('ko-KR')} 신청
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 text-xs rounded-full font-medium border ${getStatusBadge(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>

                  {/* 신청자 정보 */}
                  <div className="space-y-3 bg-gradient-to-br from-orange-50 to-orange-50/70 p-4 rounded-xl border border-orange-100 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getDepartmentIcon(department)}</span>
                      <p className="font-semibold text-gray-800 text-sm">{storeName} {department}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">매장코드</span>
                        <p className="font-medium text-gray-800">{request.dept_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">연락처</span>
                        <p className="font-medium text-gray-800">
                          {request.tel_no ? request.tel_no.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '정보 없음'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 주소 정보 */}
                  {request.dong_name && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-blue-600 font-medium">매장 주소</div>
                      <div className="text-sm text-blue-800">{request.dong_name}</div>
                      {request.dong_detail && (
                        <div className="text-sm text-blue-700 mt-1">{request.dong_detail}</div>
                      )}
                    </div>
                  )}

                  {/* 처리 정보 (승인/반려된 경우) */}
                  {request.status !== 'pending' && request.processedAt && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="text-xs text-gray-600 font-medium">처리 정보</div>
                      <div className="text-sm text-gray-800">
                        {new Date(request.processedAt).toLocaleString('ko-KR')} 처리
                      </div>
                      {request.notes && (
                        <div className="text-sm text-gray-600 mt-1">사유: {request.notes}</div>
                      )}
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  {renderActionButtons(request)}
                </div>
              );
            }) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">조건에 맞는 가입신청이 없습니다.</div>
                <small className="text-gray-400 mt-1 block">검색어나 필터를 확인해보세요</small>
              </div>
            )}
          </div>
        </main>

        {/* 상세보기 모달 */}
        {showDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">신청 상세 정보</h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">아이디</label>
                  <p className="text-gray-800 font-semibold">{selectedRequest.user_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">매장명</label>
                  <p className="text-gray-800">{selectedRequest.cust_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">담당자명</label>
                  <p className="text-gray-800">{selectedRequest.charge_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">매장코드</label>
                  <p className="text-gray-800">{selectedRequest.dept_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">연락처</label>
                  <p className="text-gray-800">
                    {selectedRequest.tel_no ? selectedRequest.tel_no.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '정보 없음'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">주소</label>
                  <p className="text-gray-800">{selectedRequest.dong_name}</p>
                  {selectedRequest.dong_detail && (
                    <p className="text-gray-600 text-sm">{selectedRequest.dong_detail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">신청일시</label>
                  <p className="text-gray-800">{new Date(selectedRequest.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">처리상태</label>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${getStatusBadge(selectedRequest.status)}`}>
                    {getStatusText(selectedRequest.status)}
                  </span>
                </div>
                {selectedRequest.processedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">처리일시</label>
                    <p className="text-gray-800">{new Date(selectedRequest.processedAt).toLocaleString('ko-KR')}</p>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">처리 사유</label>
                    <p className="text-gray-800">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                  }}
                  className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  닫기
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
            <button className="flex flex-col items-center gap-1 py-2 text-orange-500">
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

export default AccountManage;