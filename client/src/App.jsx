import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeliveryProvider } from './context/DeliveryContext';
import Login from './components/auth/Login';
import DeliveryFlow from './pages/DeliveryFlow';
import AdminPanel from './components/admin/AdminPanel';
import './styles/globals.css';

// 메인 앱 컨텐츠 컴포넌트
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [currentView, setCurrentView] = useState('login'); // 'login', 'delivery', 'admin'

  const handleNavigateToRegister = () => {
    console.log('Navigate to register');
    // 회원가입 페이지로 이동 로직
  };

  const handleNavigateToIdRequest = () => {
    console.log('Navigate to ID request');
    // 아이디 발급 페이지로 이동 로직
  };

  const handleNavigateToAdmin = () => {
    setCurrentView('admin');
  };

  const handleBackToDelivery = () => {
    setCurrentView('delivery');
  };

  // URL 기반 라우팅 처리
  React.useEffect(() => {
    if (location.pathname === '/admin') {
      setCurrentView('admin');
    } else if (location.pathname === '/' && isAuthenticated) {
      setCurrentView('delivery'); // 로그인 후 바로 배송 페이지로 이동
    } else if (!isAuthenticated) {
      setCurrentView('login');
    }
  }, [location.pathname, isAuthenticated]);

  // 로그인 상태 변경 시 자동 리다이렉션
  React.useEffect(() => {
    if (isAuthenticated && currentView === 'login') {
      setCurrentView('delivery'); // 로그인 성공 시 배송 페이지로 이동
    }
  }, [isAuthenticated, currentView]);

  // 현재 뷰에 따른 렌더링
  const renderCurrentView = () => {
    if (!isAuthenticated && currentView !== 'admin') {
      return (
        <Login
          onNavigateToRegister={handleNavigateToRegister}
          onNavigateToIdRequest={handleNavigateToIdRequest}
        />
      );
    }

    switch (currentView) {
      case 'admin':
        return (
          <div>
            <AdminPanel />
            {isAuthenticated && (
              <button
                onClick={handleBackToDelivery}
                className="fixed top-4 left-4 z-50 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                title="배송 페이지로 돌아가기"
              >
                ← 배송
              </button>
            )}
          </div>
        );

      case 'delivery':
      default:
        return <DeliveryFlow />;
    }
  };

  return renderCurrentView();
};

// 라우터 기반 앱 컴포넌트
const RouterApp = () => {
  return (
    <Router>
      <AuthProvider>
        <DeliveryProvider>
          <div className="App">
            <Routes>
              {/* 기본 페이지 */}
              <Route path="/" element={<AppContent />} />
              {/* 관리자 페이지 */}
              <Route path="/admin" element={<AppContent />} />
              {/* 기타 라우트들 */}
              <Route path="/delivery" element={<AppContent />} />
              {/* 404 페이지 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </DeliveryProvider>
      </AuthProvider>
    </Router>
  );
};

// 메인 App 컴포넌트
function App() {
  return <RouterApp />;
}

export default App;