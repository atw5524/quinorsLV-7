import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AccountIssue from '../AccountMD/AccountIssue';
import WelcomePopup from '../Popup/WelcomePopup';

const Login = ({ onLogin, onNavigateToRegister, onNavigateToIdRequest }) => {
  const { login, error, loading, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountIssue, setShowAccountIssue] = useState(false);
  const [loginError, setLoginError] = useState('');

  // 팝업 상태 관리
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 입력 시 에러 메시지 초기화
    if (loginError) {
      setLoginError('');
    }
    if (error) {
      clearError();
    }
  };

  const validateFormData = () => {
    if (!formData.username.trim()) {
      setLoginError('사용자 ID를 입력해주세요.');
      return false;
    }

    if (!formData.password.trim()) {
      setLoginError('비밀번호를 입력해주세요.');
      return false;
    }

    if (formData.username.length < 6) {
      setLoginError('사용자 ID는 6자리 이상이어야 합니다.');
      return false;
    }

    if (formData.password.length < 6) {
      setLoginError('비밀번호는 6자리 이상이어야 합니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateFormData()) {
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      await login(formData);
      console.log('✅ 로그인 성공!');
      
      if (onLogin) {
        onLogin(formData);
      }
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      setLoginError(error.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
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

  const currentError = loginError || error;

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
                  className="w-9 h-9 text-white hidden"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{ display: 'none' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">퀴노스 비즈니스</h1>
              <p className="text-white/80 text-sm">루이비통 담당자용</p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Error Message */}
            {currentError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 whitespace-pre-line">{currentError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  사용자 ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="발급받은 사용자 ID를 입력하세요"
                  required
                  disabled={isLoading || loading}
                  autoComplete="username"
                />
                <small className="text-gray-500 text-xs mt-1">6자리 이상의 대문자, 숫자, 언더스코어</small>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    placeholder="비밀번호를 입력하세요"
                    required
                    disabled={isLoading || loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading || loading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                <small className="text-gray-500 text-xs mt-1">임시 비밀번호로 로그인 후 변경해주세요</small>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    disabled={isLoading || loading}
                  />
                  <span className="ml-2 text-sm text-gray-600">로그인 상태 유지</span>
                </label>
                <span className="text-sm text-orange-500 hover:text-orange-400 cursor-pointer transition-colors">
                  비밀번호 찾기
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || loading}
                className="w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center">
                  {(isLoading || loading) ? (
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
                disabled={isLoading || loading}
              >
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-gray-700">계정 발급 신청</span>
              </button>
            </div>

            {/* Help Section */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 text-sm">로그인 관련 도움말</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 계정 발급 완료 후 받은 사용자 ID와 임시 비밀번호를 사용하세요</li>
                <li>• 최초 로그인 후 반드시 비밀번호를 변경해주세요</li>
                <li>• 5회 로그인 실패 시 1시간 동안 계정이 잠깁니다</li>
                <li>• 로그인 정보를 잊어버린 경우 관리자에게 문의하세요</li>
              </ul>
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