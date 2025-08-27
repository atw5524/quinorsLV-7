import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AccountIssue from '../AccountMD/Register';
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
      setLoginError('아이디를 입력해주세요.');
      return false;
    }
    if (!formData.password.trim()) {
      setLoginError('비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.username.length < 6) {
      setLoginError('아이디는 6자리 이상이어야 합니다.');
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

  return (
    <>
      <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden min-h-[600px] max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <header className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white p-6 pt-12 pb-8 flex-shrink-0">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 384 512">
                  <path d="M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm80 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V240zM80 96h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16zm80 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V112zM272 96h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16z"/>
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">퀴노스 비즈니스 로그인</h1>
              <p className="text-white/80 text-xs sm:text-sm">거래처 전용</p>
            </div>
          </header>

          {/* Main Content - 스크롤 가능하도록 수정 */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">로그인</h2>
                <p className="text-gray-500 text-xs sm:text-sm">승인받은 계정 정보를 입력해주세요</p>
              </div>

              {/* Error Display */}
              {(loginError || error) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{loginError || error}</p>
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-4 sm:space-y-5 mb-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">아이디</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 512 512">
                        <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
                      </svg>
                    </div>
                    <input 
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm sm:text-base" 
                      placeholder="승인받은 아이디를 입력하세요"
                      required
                      disabled={isLoading || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">비밀번호</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 448 512">
                        <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
                      </svg>
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-12 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm sm:text-base" 
                      placeholder="비밀번호를 입력하세요"
                      required
                      disabled={isLoading || loading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600"
                        onClick={togglePasswordVisibility}
                        disabled={isLoading || loading}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 576 512">
                          {showPassword ? (
                            <path d="m288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/>
                          ) : (
                            <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z"/>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
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
                  <span className="text-sm text-orange-500 hover:text-orange-600 cursor-pointer">비밀번호 찾기</span>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || loading}
                  className="w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(isLoading || loading) ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      로그인 중...
                    </div>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>

              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">또는</span>
                </div>
              </div>

              {/* 회원가입 신청 버튼 - 하나만 유지 */}
              <div className="space-y-3 mb-6">
                <button 
                  className="w-full flex items-center justify-center gap-3 py-3 sm:py-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  onClick={handleAccountIssue}
                  disabled={isLoading || loading}
                >
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 640 512">
                    <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM504 312V248H440c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V136c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H552v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
                  </svg>
                  <span className="font-medium text-gray-700 text-sm sm:text-base">회원가입 신청</span>
                </button>
              </div>

              {/* 안내 텍스트만 유지 */}
              <div className="text-center">
                <div className="text-xs text-gray-400 leading-relaxed">
                  • 회원가입 신청 후 관리자 승인을 기다려주세요<br/>
                  • 승인 완료 후 발급받은 ID로 로그인하세요<br/>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* 회원가입 신청 모달 */}
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