import React, { useState, useEffect, useRef } from 'react';
import AccountManage from './AccountManage';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'requests', 'account-manage'
  const [stats, setStats] = useState({
    requests: { total: 0, pending: 0, approved: 0, rejected: 0 },
    users: { total: 0, active: 0, inactive: 0 }
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [recentActivities, setRecentActivities] = useState([]);
  const [error, setError] = useState(null);
  
  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);

  // 안전한 상태 업데이트 함수
  const safeSetState = (setter) => {
    if (isMountedRef.current) {
      setter();
    }
  };

  // API 호출 함수들 (기존과 동일)
  const fetchStats = async () => {
    try {
      console.log('📊 통계 API 호출 시작...');
      const response = await fetch('http://localhost:5480/api/admin/stats');
      const result = await response.json();
      
      console.log('📊 통계 API 응답:', result);
      
      if (response.ok && result.success) {
        console.log('📊 ✅ 통계 데이터 처리 성공:', result.data);
        if (isMountedRef.current) {
          setStats(result.data);
          setError(null);
        }
      } else {
        console.error('📊 ❌ 통계 API 실패:', result);
        setError('통계 조회 실패: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('📊 ❌ 통계 조회 네트워크 오류:', error);
      setError('통계 조회 중 네트워크 오류: ' + error.message);
    }
  };

  const fetchRequests = async (status = 'all') => {
    try {
      console.log('📋 신청 목록 API 호출 시작... status:', status);
      setLoading(true);
      
      const response = await fetch(`http://localhost:5480/api/admin/requests?status=${status}`);
      const result = await response.json();
      
      console.log('📋 신청 목록 API 응답:', result);
      
      if (response.ok && result.success) {
        console.log('📋 ✅ 신청 목록 데이터 처리 성공:', result.data);
        if (isMountedRef.current) {
          const requestsData = result.data || [];
          setRequests(requestsData);
          updateRecentActivities(requestsData);
          setError(null);
        }
      } else {
        console.error('📋 ❌ 신청 목록 API 실패:', result);
        setError('신청 목록 조회 실패: ' + (result.message || 'Unknown error'));
        if (isMountedRef.current) {
          setRequests([]);
        }
      }
    } catch (error) {
      console.error('📋 ❌ 신청 목록 조회 네트워크 오류:', error);
      setError('신청 목록 조회 중 네트워크 오류: ' + error.message);
      if (isMountedRef.current) {
        setRequests([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const updateRecentActivities = (requestsData) => {
    if (!isMountedRef.current || !Array.isArray(requestsData)) {
      console.log('🔄 최근 활동 업데이트 중단 - 마운트 상태 또는 데이터 문제');
      return;
    }
    
    console.log('🔄 최근 활동 업데이트 시작, 전체 데이터:', requestsData.length);
    
    const processedRequests = requestsData.filter(req => {
      const hasProcessedDate = req.processedDate;
      const isProcessed = req.status === 'approved' || req.status === 'rejected';
      return hasProcessedDate && isProcessed;
    });
    
    console.log('🔄 처리된 요청 수:', processedRequests.length);
    
    const activities = processedRequests
      .sort((a, b) => new Date(b.processedDate) - new Date(a.processedDate))
      .slice(0, 3)
      .map(req => ({
        id: req._id,
        name: req.managerName,
        store: req.storeCode,
        status: req.status,
        time: getTimeAgo(req.processedDate),
        notes: req.notes
      }));
    
    console.log('🔄 최종 최근 활동:', activities);
    setRecentActivities(activities);
  };

  const getTimeAgo = (dateString) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      return `${diffDays}일 전`;
    } catch (error) {
      console.error('시간 계산 오류:', error);
      return '알 수 없음';
    }
  };

  const handleApprove = async (requestId, buttonElement) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('✅ 승인 처리 시작:', requestId);
      
      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }
      
      setProcessingIds(prev => new Set([...prev, requestId]));
      
      const response = await fetch(`http://localhost:5480/api/admin/approve/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: '관리자 승인 완료'
        }),
      });

      const result = await response.json();
      console.log('✅ 승인 API 응답:', result);
      
      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-orange-50');
            if (parentCard) {
              parentCard.style.opacity = '0.5';
            }
            buttonElement.innerHTML = '승인완료';
            buttonElement.className = 'px-3 py-1 bg-green-600 text-white text-xs rounded-md';
          }
        }, 1500);
        
        alert(`계정 승인 완료!\n사용자 ID: ${result.data.userId}\n임시 비밀번호: ${result.data.tempPassword}`);
        await Promise.all([fetchRequests(), fetchStats()]);
      } else {
        console.error('✅ 승인 실패:', result);
        alert(`승인 실패: ${result.message}`);
        if (buttonElement) {
          buttonElement.innerHTML = '승인';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('✅ 승인 처리 실패:', error);
      alert('승인 처리 중 오류가 발생했습니다.');
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

  const handleReject = async (requestId, buttonElement) => {
    if (!isMountedRef.current) return;
    
    try {
      const notes = prompt('거부 사유를 입력해주세요:', '서류 미비');
      if (!notes) return;

      console.log('❌ 거부 처리 시작:', requestId);

      if (buttonElement) {
        buttonElement.innerHTML = '처리중...';
        buttonElement.disabled = true;
      }

      setProcessingIds(prev => new Set([...prev, requestId]));

      const response = await fetch(`http://localhost:5480/api/admin/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      const result = await response.json();
      console.log('❌ 거부 API 응답:', result);

      if (response.ok && result.success) {
        setTimeout(() => {
          if (buttonElement) {
            const parentCard = buttonElement.closest('.bg-orange-50');
            if (parentCard) {
              parentCard.style.opacity = '0.5';
            }
            buttonElement.innerHTML = '반려완료';
            buttonElement.className = 'px-3 py-1 bg-red-500 text-white text-xs rounded-md';
          }
        }, 1500);

        alert('신청이 거부되었습니다.');
        await Promise.all([fetchRequests(), fetchStats()]);
      } else {
        console.error('❌ 거부 실패:', result);
        alert(`거부 실패: ${result.message}`);
        if (buttonElement) {
          buttonElement.innerHTML = '반려';
          buttonElement.disabled = false;
        }
      }
    } catch (error) {
      console.error('❌ 거부 처리 실패:', error);
      alert('거부 처리 중 오류가 발생했습니다.');
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

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🚀 관리자 패널 마운트 - 데이터 로드 시작');
    isMountedRef.current = true;
    
    fetchStats();
    fetchRequests();

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 자동 새로고침 실행');
        fetchStats();
        fetchRequests();
      }
    }, 30000);

    return () => {
      console.log('🧹 관리자 패널 언마운트 - 정리 작업');
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 계산된 값들
  const todayRequests = requests.filter(req => {
    const today = new Date().toDateString();
    const requestDate = new Date(req.createdAt).toDateString();
    return today === requestDate;
  }).length;

  const thisWeekRequests = requests.filter(req => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(req.createdAt) > weekAgo;
  }).length;

  const pendingRequests = requests.filter(req => req.status === 'pending');

  // 디버깅 정보 출력
  console.log('📊 현재 상태:', {
    activeTab,
    stats,
    requestsCount: requests.length,
    pendingCount: pendingRequests.length,
    recentActivitiesCount: recentActivities.length,
    todayRequests,
    thisWeekRequests,
    loading,
    error
  });

  // AccountManage 탭인 경우 AccountManage 컴포넌트 렌더링
  if (activeTab === 'account-manage') {
    return <AccountManage onBackToAdmin={() => setActiveTab('dashboard')} />;
  }

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
          <div>📊 Stats: 총 {stats.requests.total}, 대기 {stats.requests.pending}, 승인 {stats.requests.approved}</div>
          <div>📋 Requests: {requests.length}개, Pending: {pendingRequests.length}개</div>
          <div>🔄 Recent: {recentActivities.length}개</div>
          <div>📅 Today: {todayRequests}, Week: {thisWeekRequests}</div>
          <div>🎯 Active Tab: {activeTab}</div>
          {loading && <div>⏳ 로딩 중...</div>}
        </div>
        
        {/* Header */}
        <header id="header" className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-4 pt-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 640 512">
                  <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c1.8 0 3.5-.2 5.3-.5c-76.3-55.1-99.8-141-103.1-200.2c-16.1-4.8-33.1-7.3-50.7-7.3H178.3zm308.8-78.3l-120 48C358 277.4 352 286.2 352 296c0 63.3 25.9 168.8 134.8 214.2c5.9 2.5 12.6 2.5 18.5 0C614.1 464.8 640 359.3 640 296c0-9.8-6-18.6-15.1-22.3l-120-48c-5.7-2.3-12.1-2.3-17.8 0zM591.4 312c-3.9 50.7-27.2 116.7-95.4 149.7V273.8L591.4 312z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">관리자 대시보드</h1>
                <p className="text-white/80 text-xs">계정 신청 관리</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 448 512">
                  <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
                </svg>
              </button>
              <img 
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" 
                className="w-8 h-8 rounded-lg"
                alt="Admin Avatar"
              />
            </div>
          </div>
          
          {/* Admin Stats */}
          <div id="admin-stats" className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-white/80 text-xs mb-1">신청 계정</div>
              <div className="text-xl font-bold text-white">{stats.requests.total}</div>
              <div className="text-green-300 text-xs">+{thisWeekRequests} 이번주</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-white/80 text-xs mb-1">승인 대기</div>
              <div className="text-xl font-bold text-white">{stats.requests.pending}</div>
              <div className="text-orange-300 text-xs">검토 필요</div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="p-4 pb-20">
          <div id="dashboard-overview" className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">계정 신청 관리</h2>
            
            {/* Application Stats */}
            <div id="application-stats" className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-gray-500 text-sm mb-1">신규 신청</div>
                <div className="text-2xl font-bold text-gray-800">{stats.requests.pending}</div>
                <div className="text-orange-500 text-sm">+{todayRequests} 오늘</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-gray-500 text-sm mb-1">승인 완료</div>
                <div className="text-2xl font-bold text-gray-800">{stats.requests.approved}</div>
                <div className="text-green-500 text-sm">전체</div>
              </div>
            </div>

            {/* Pending Applications */}
            <div id="pending-applications" className="bg-white rounded-xl p-4 shadow-sm border mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">승인 대기 계정</h3>
                <button 
                  className="text-orange-500 text-sm"
                  onClick={() => {
                    console.log('🔄 전체보기 클릭 - 데이터 새로고침');
                    fetchRequests();
                  }}
                >
                  전체보기
                </button>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    ⏳ 데이터를 불러오는 중...
                  </div>
                ) : pendingRequests.length > 0 ? pendingRequests.slice(0, 2).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 640 512">
                          <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{request.managerName}</div>
                        <div className="text-xs text-gray-500">
                          {request.storeCode} · 연락처: ****{request.phoneLast4}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
                        onClick={(e) => handleApprove(request._id, e.target)}
                      >
                        승인
                      </button>
                      <button 
                        className="px-3 py-1 bg-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-400 transition-colors"
                        onClick={(e) => handleReject(request._id, e.target)}
                      >
                        반려
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    승인 대기 중인 계정이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div id="recent-applications" className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-800 mb-3">최근 처리된 계정</h3>
              <div className="space-y-3">
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                  <div key={`${activity.id}-${index}`} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      {activity.status === 'approved' ? (
                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 448 512">
                          <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 384 512">
                          <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">
                        {activity.name} ({activity.store})
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.status === 'approved' ? '계정 승인 완료' : 
                         activity.notes ? `${activity.notes}로 반려` : '서류 미비로 반려'} - {activity.time}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    최근 처리된 계정이 없습니다.
                    <br />
                    <small className="text-gray-400">승인/거부 처리 후 여기에 표시됩니다</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Navigation - 통합된 네비게이션 */}
        <nav id="bottom-nav" className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-1">
            <button 
              className={`flex flex-col items-center gap-1 py-2 ${
                activeTab === 'dashboard' ? 'text-orange-500' : 'text-gray-400'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 576 512">
                <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
              </svg>
              <span className="text-xs">홈</span>
            </button>
            <button 
              className={`flex flex-col items-center gap-1 py-2 relative ${
                activeTab === 'account-manage' ? 'text-orange-500' : 'text-gray-400'
              }`}
              onClick={() => {
                console.log('👥 계정관리 탭 클릭');
                setActiveTab('account-manage');
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 640 512">
                <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
              </svg>
              <span className="text-xs">계정관리</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-2 text-gray-400">
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

export default AdminPanel;