import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  token: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 페이지 로드 시 저장된 인증 정보 복원
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
      try {
        const parsedUserInfo = JSON.parse(userInfo);
        dispatch({
          type: 'RESTORE_SESSION',
          payload: {
            user: parsedUserInfo,
            token: token
          }
        });
        console.log('✅ 세션 복원 성공:', parsedUserInfo.managerName);
      } catch (error) {
        console.error('세션 복원 오류:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('🔐 로그인 시도:', { userId: credentials.username });

      // 서버 상태 확인
      const healthResponse = await fetch('https://quinors-lv-backend.ngrok.io/api/health');
      if (!healthResponse.ok) {
        throw new Error('서버에 연결할 수 없습니다.');
      }

      // 로그인 API 호출
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          userId: credentials.username,
          password: credentials.password
        }),
      });

      const result = await response.json();
      console.log('📨 로그인 응답:', result);

      if (response.ok && result.success) {
        const { token, user } = result.data;
        
        // 토큰과 사용자 정보 저장
        if (credentials.rememberMe) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userInfo', JSON.stringify(user));
        } else {
          sessionStorage.setItem('authToken', token);
          sessionStorage.setItem('userInfo', JSON.stringify(user));
        }
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token }
        });
        
        console.log('✅ 로그인 성공:', user.managerName);
        return { user, token };
      } else {
        // 특별한 에러 케이스 처리
        if (response.status === 423) {
          throw new Error(`계정이 잠겨있습니다.\n잠금 해제: ${new Date(result.lockedUntil).toLocaleString('ko-KR')}`);
        } else if (result.remainingAttempts !== undefined) {
          throw new Error(`${result.message}\n남은 시도 횟수: ${result.remainingAttempts}회`);
        } else {
          throw new Error(result.message || '로그인에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    dispatch({ type: 'LOGOUT' });
    console.log('🚪 로그아웃 완료');
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 비밀번호 변경 함수
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = state.token || localStorage.getItem('authToken');
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return result;
      } else {
        throw new Error(result.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      clearError,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};