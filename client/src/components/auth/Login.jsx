import React, { useState, useEffect } from 'react';
import AccountIssue from '../AccountMD/AccountIssue';
import WelcomePopup from '../Popup/WelcomePopup';

const Login = ({ onLogin, onNavigateToRegister, onNavigateToIdRequest }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountIssue, setShowAccountIssue] = useState(false);
  
  //  팝업 상태 관리
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      setTimeout(async () => {
        if (onLogin) {
          await onLogin(formData);
        }
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      console.error('Login error:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAccountIssue = () => {
    setShowAccountIssue(true);
  };

  const handleCloseAccountIssue = () => {
    setShowAccountIssue(false);
  };

  // 팝업 제어 함수들
  const handleCloseWelcome = () => {
    setShowWelcomePopup(false);
  };

  // 페이지 로드 시 팝업 표시 체크
  useEffect(() => {
    const hideUntil = localStorage.getItem('hideWelcomeUntil');
    const today = new Date().toDateString();
    
    if (hideUntil !== today) {
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <div className="bg-gray-100 font-sans flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden max-h-[95vh] flex flex-col">
          
          <header className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-6 pt-12 pb-6 flex-shrink-0">
            <div className="text-center">
              <div className="mx-auto mb-4 flex items-center justify-center h-16">
                <img 
                  src="/Login.png"
                  alt="퀴노스 로고" 
                  className="w-14 h-14 object-contain"
                  style={{
                    filter: 'brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,0.1))'
                  }}
                  onError={(e) => {
                    console.log('이미지 로드 실패: /Login.png');
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                  onLoad={() => {
                    console.log('이미지 로드 성공: /Login.png');
                  }}
                />
                <svg 
                  className="w-9 h-9 text-white"
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ display: 'none' }}
                >
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-1">퀴노스 비즈니스 로그인</h1>
              <p className="text-white/80 text-sm">루이비통 담당자용</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">로그인</h2>
                <p className="text-gray-500 text-sm">계정 정보를 입력해주세요</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">아이디</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="아이디를 입력하세요"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">비밀번호</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="비밀번호를 입력하세요"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">로그인 상태 유지</span>
                  </label>
                  <span className="text-sm text-orange-500 hover:text-orange-400 cursor-pointer transition-colors">
                    비밀번호 찾기
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        로그인 중...
                      </>
                    ) : (
                      '로그인'
                    )}
                  </div>
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">또는</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleAccountIssue}
                  className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <span className="font-medium text-gray-700">계정 발급</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* 계정 발급 모달 */}
      <AccountIssue 
        isOpen={showAccountIssue} 
        onClose={handleCloseAccountIssue} 
      />

      {/* 팝업 컴포넌트 - 연결 */}
      <WelcomePopup 
        isOpen={showWelcomePopup} 
        onClose={handleCloseWelcome} 
      />
    </>
  );
};

export default Login;