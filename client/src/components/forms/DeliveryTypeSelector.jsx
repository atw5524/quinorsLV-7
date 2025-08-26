import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';

const DeliveryTypeSelector = () => {
  const context = useDelivery();
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  
  // 사용자 메뉴 관련 상태
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [storeName, setStoreName] = useState('');

  // 안전성 체크 추가
  if (!context) {
    return <div>Loading...</div>;
  }

  const { deliveryType, dispatch } = context;
  const [selectedOption, setSelectedOption] = useState(deliveryType || '');

  // 사용자 이름 기반 아바타 URL 생성 함수
  const generateAvatarUrl = (name) => {
    if (!name) return null;
    
    // 사용자 이름에서 첫 글자 추출 (한글/영문 모두 지원)
    const firstChar = name.charAt(0);
    
    // UI Avatars 서비스 사용 - 한글도 지원하며 안정적
    const avatarUrl = `https://ui-avatars.com/api/?` + 
      `name=${encodeURIComponent(firstChar)}&` +
      `size=40&` +
      `background=f97316&` +  // 오렌지 배경색
      `color=ffffff&` +       // 흰색 텍스트
      `font-size=0.6&` +      // 폰트 크기
      `rounded=true&` +       // 둥근 모양
      `bold=true`;            // 굵은 글씨
    
    return avatarUrl;
  };

  // 매장명 조회 함수
  const fetchStoreName = async (storeCode) => {
    try {
      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/admin/stores?search=${storeCode}&limit=1`);
      const result = await response.json();
      
      if (response.ok && result.success && result.data.length > 0) {
        const store = result.data.find(s => s.storeCode === storeCode);
        if (store) {
          setStoreName(store.storeName);
          console.log('✅ 매장명 조회 성공:', { storeCode, storeName: store.storeName });
        }
      } else {
        console.log('❌ 매장명 조회 실패, 매장코드 사용:', storeCode);
        setStoreName(storeCode);
      }
    } catch (error) {
      console.error('❌ 매장명 조회 오류:', error);
      setStoreName(storeCode);
    }
  };

  // 사용자 정보 변경 시 매장명 조회
  useEffect(() => {
    if (user && user.storeCode) {
      if (user.storeName) {
        setStoreName(user.storeName);
      } else {
        fetchStoreName(user.storeCode);
      }
    }
  }, [user]);

  // 사용자 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const deliveryOptions = [
    {
      id: 'store-to-store',
      title: '매장 ↔ 매장',
      subtitle: '매장별 배송',
      icon: 'fa-store'
    },
    {
      id: 'store-to-customer',
      title: '매장 ↔ 고객',
      subtitle: '고객 배송',
      icon: 'fa-user'
    },
    {
      id: 'store-to-partner',
      title: '매장 ↔ 협력사',
      subtitle: '협력사 배송',
      icon: 'fa-handshake'
    }
  ];

  const handleOptionSelect = (option) => {
    setSelectedOption(option.title);
  };

  const handleNext = () => {
    if (selectedOption && dispatch) {
      dispatch({ type: 'SET_DELIVERY_TYPE', payload: selectedOption });
    }
  };

  const handleEditPreview = () => {
    setSelectedOption('');
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      logout();
      setStoreName('');
    }
  };

  const handleChangePasswordClick = () => {
    setShowUserMenu(false);
    setShowChangePassword(true);
  };

  const handleNavigateToAdmin = () => {
    setShowUserMenu(false);
    console.log('🔧 관리자 패널로 이동 중...');
    navigate('/admin');
  };

  const handleChangePasswordSubmit = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('새 비밀번호는 6자리 이상이어야 합니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      alert('비밀번호가 성공적으로 변경되었습니다.');
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      alert(error.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
        
        {/* HTML 스타일의 회원정보 헤더 */}
        {user && (
          <header className="bg-white border-b border-gray-200 pt-12 pb-4 relative z-40">
            {/* 사용자 정보 영역 */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {/* 사용자 이름 기반 아바타 */}
                <img 
                  src={generateAvatarUrl(user.managerName)}
                  alt="User Avatar" 
                  className="w-10 h-10 rounded-full border-2 border-orange-500/20 bg-orange-500"
                  onError={(e) => {
                    // 아바타 로드 실패 시 더 예쁜 기본 아바타로 대체
                    const canvas = document.createElement('canvas');
                    canvas.width = 40;
                    canvas.height = 40;
                    const ctx = canvas.getContext('2d');
                    
                    // 오렌지 원형 배경
                    ctx.fillStyle = '#f97316';
                    ctx.beginPath();
                    ctx.arc(20, 20, 20, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // 흰색 텍스트 (사용자 이름 첫 글자)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const firstChar = user.managerName ? user.managerName.charAt(0) : 'U';
                    ctx.fillText(firstChar, 20, 20);
                    
                    e.target.src = canvas.toDataURL();
                  }}
                />
                <div>
                  <p className="text-sm font-bold text-gray-800">{user.managerName}님</p>
                  <p className="text-xs text-gray-500">
                    {storeName || user.storeCode} 매니저
                    {user.department && ` • ${user.department}부`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 알림 버튼 */}
                <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-orange-500/10 hover:text-orange-500 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                
                {/* 사용자 설정 버튼 */}
                <div className="relative user-menu-container">
                  <button 
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* 드롭다운 메뉴 */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999]">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.managerName}</p>
                        <p className="text-xs text-gray-500">{user.userId}</p>
                        <p className="text-xs text-gray-500">
                          {storeName || user.storeCode}
                          {user.department && ` • ${user.department}부`}
                        </p>
                      </div>
                      
                      <button
                        onClick={handleChangePasswordClick}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        비밀번호 변경
                      </button>
                      
                      {user.role === 'admin' && (
                        <button
                          onClick={handleNavigateToAdmin}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.681.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          관리자 패널
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                          </svg>
                          로그아웃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* 기존 Header 컴포넌트 - z-index 조정 */}
        <div className="relative z-30">
          <Header 
            title="배송 유형"
            subtitle="배송 유형을 선택해주세요"
            currentStep={1}
          />
        </div>

        <main className="flex-1 bg-gray-50 p-6 space-y-4 overflow-y-auto pb-20">
          <div className="flex flex-col gap-4">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={`bg-white p-5 rounded-2xl border shadow-sm transition-all duration-300 cursor-pointer ${
                  selectedOption === option.title
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-orange-500 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                      <i className={`fa-solid ${option.icon} fa-xl`}></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {option.title}
                      </h3>
                      <p className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-1 mt-1 inline-block">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-right text-gray-400"></i>
                </div>
              </div>
            ))}
          </div>
        </main>

        <FloatingPreview 
          content={selectedOption}
          onEdit={handleEditPreview}
          show={!!selectedOption}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleNext} disabled={!selectedOption}>
            다음 단계
          </Button>
        </footer>

        {/* 비밀번호 변경 모달 */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">비밀번호 변경</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="현재 비밀번호를 입력하세요"
                    disabled={isChangingPassword}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="새 비밀번호 (6자리 이상)"
                    disabled={isChangingPassword}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="새 비밀번호를 다시 입력하세요"
                    disabled={isChangingPassword}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isChangingPassword}
                >
                  취소
                </button>
                <button
                  onClick={handleChangePasswordSubmit}
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? '변경 중...' : '변경'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryTypeSelector;