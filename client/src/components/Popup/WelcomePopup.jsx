import React, { useState, useEffect } from 'react';

const WelcomePopup = ({ isOpen, onClose }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // 웰컴 팝업 관련 함수들
  const hideWelcome = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const confirmAndHide = () => {
    // "확인했습니다" 클릭 시 오늘 하루 표시 안 함
    const today = new Date().toDateString();
    localStorage.setItem('hideWelcomeUntil', today);
    hideWelcome();
  };

  const handleAndroidGuide = () => {
    alert('준비중');
  };

  const handleIOSGuide = () => {
    alert('준비중');
  };

  // 팝업이 열릴 때 애니메이션 시작
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        setIsAnimating(true);
      }, 50);
    } else {
      document.body.style.overflow = 'auto';
      setIsAnimating(false);
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // ESC 키로 팝업 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        hideWelcome();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-end justify-center z-50 p-4 transition-all duration-300 ${
        isAnimating ? 'bg-opacity-60' : 'bg-opacity-0'
      }`}
      style={{ backdropFilter: isAnimating ? 'blur(4px)' : 'blur(0px)' }}
    >
      <div 
        className={`bg-white rounded-t-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden transition-all duration-500 ease-out ${
          isAnimating ? 'transform translate-y-0 opacity-100' : 'transform translate-y-full opacity-0'
        }`}
      >
        
        {/* 헤더 섹션 */}
        <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 p-8 text-center relative">
          
          {/* 닫기 버튼 */}
          <button 
            onClick={hideWelcome}
            className="absolute top-4 right-4 text-white/90 hover:text-white z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* 메인 콘텐츠 */}
          <div className="relative z-10">
            <div className="w-16 h-2 mx-auto mb-6 bg-white/40 rounded-full"></div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">퀴노스 비즈니스</h2>
            <p className="text-xl text-white/95 mb-2 font-medium">오신것을 환영합니다!</p>
            <p className="text-white/80 text-sm">홈화면에 추가하여 더욱 편리하게 이용하세요</p>
          </div>
        </div>
        
        {/* 본문 섹션 */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">홈화면 추가 방법</h3>
            <p className="text-gray-500 text-sm">기기에 맞는 방법을 선택해주세요</p>
          </div>
          
          <div className="space-y-4">
            {/* 안드로이드 버튼 */}
            <div 
              onClick={handleAndroidGuide}
              className="group p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            >
              <div className="flex items-center justify-center">
                {/* 안드로이드 아이콘 */}
                <svg className="w-8 h-8 text-green-600 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396"/>
                </svg>
                <div className="text-center">
                  <div className="font-bold text-gray-800 mb-1 text-lg">안드로이드 이용자</div>
                  <div className="text-green-600 text-sm font-medium group-hover:underline">
                    여기를 클릭해주세요 →
                  </div>
                </div>
              </div>
            </div>
            
            {/* iOS 버튼 */}
            <div 
              onClick={handleIOSGuide}
              className="group p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            >
              <div className="flex items-center justify-center">
                {/* iOS/Apple 아이콘 */}
                <svg className="w-8 h-8 text-gray-700 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-center">
                  <div className="font-bold text-gray-800 mb-1 text-lg">iOS 이용자</div>
                  <div className="text-gray-600 text-sm font-medium group-hover:underline">
                    여기를 클릭해주세요 →
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 하단 버튼 */}
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
            <button 
              onClick={confirmAndHide}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-xl font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-lg"
            >
              확인했습니다
            </button>
            <button 
              onClick={hideWelcome}
              className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;