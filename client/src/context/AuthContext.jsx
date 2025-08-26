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
    
    case 'REGISTER_START':
      return { ...state, loading: true, error: null };
    
    case 'REGISTER_SUCCESS':
      return { ...state, loading: false, error: null };
    
    case 'REGISTER_FAILURE':
      return { ...state, loading: false, error: action.payload };
    
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
        console.log('✅ 세션 복원 완료:', parsedUserInfo.charge_name || parsedUserInfo.user_id);
      } catch (error) {
        console.error('❌ 세션 복원 중 오류 발생:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  // 로그인 함수
  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('🔐 로그인 시도 중:', { userId: credentials.username });
      
      // 서버 상태 확인
      const healthResponse = await fetch('https://quinors-lv-backend.ngrok.io/api/health');
      if (!healthResponse.ok) {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      // 로그인 API 호출
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: credentials.username, // 새로운 필드명에 맞게 수정
          password: credentials.password,
          rememberMe: credentials.rememberMe || false
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다. 관리자에게 문의하세요.');
      }

      const result = await response.json();
      console.log('📋 로그인 응답 확인:', result);

      if (response.ok && result.success) {
        const { user, token } = result.data;
        
        // 로컬 스토리지에 저장
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

        console.log('✅ 로그인 성공:', user.charge_name || user.user_id);
      } else {
        // 서버에서 제공하는 한국어 메시지 우선 사용
        const errorMessage = result.message || '아이디 또는 비밀번호가 올바르지 않습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      
      // 구체적인 한국어 에러 메시지 처리
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n• 인터넷 연결을 확인해주세요\n• 서버 상태를 확인해주세요\n• 잠시 후 다시 시도해주세요';
      } else if (error.message.includes('JSON')) {
        errorMessage = '서버 응답 처리 중 오류가 발생했습니다.\n관리자에게 문의해주세요.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = '네트워크 연결에 문제가 있습니다.\n인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
      }
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  };

  // 회원가입 함수
  const register = async (registerData) => {
    dispatch({ type: 'REGISTER_START' });
    
    try {
      console.log('📝 회원가입 요청 중:', { user_id: registerData.user_id });
      
      // 서버 상태 확인
      const healthResponse = await fetch('https://quinors-lv-backend.ngrok.io/api/health');
      if (!healthResponse.ok) {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      // 회원가입 API 호출
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: registerData.user_id,
          password: registerData.password,
          cust_name: registerData.cust_name,
          dong_name: registerData.dong_name,
          dong_detail: registerData.dong_detail || '',
          dept_name: registerData.dept_name,
          charge_name: registerData.charge_name,
          tel_no: registerData.tel_no.replace(/[^0-9]/g, '') // 숫자만 저장
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다. 관리자에게 문의하세요.');
      }

      const result = await response.json();
      console.log('📋 회원가입 응답 확인:', result);

      if (response.ok && result.success) {
        dispatch({ type: 'REGISTER_SUCCESS' });
        console.log('✅ 회원가입 신청 완료:', registerData.user_id);
        return result;
      } else {
        // 서버에서 제공하는 한국어 메시지 우선 사용
        const errorMessage = result.message || '회원가입 처리 중 오류가 발생했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      
      // 구체적인 한국어 에러 메시지 처리
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n• 인터넷 연결을 확인해주세요\n• 서버 상태를 확인해주세요\n• 잠시 후 다시 시도해주세요';
      } else if (error.message.includes('JSON')) {
        errorMessage = '서버 응답 처리 중 오류가 발생했습니다.\n관리자에게 문의해주세요.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = '네트워크 연결에 문제가 있습니다.\n인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('duplicate') || error.message.includes('중복')) {
        errorMessage = '이미 사용 중인 아이디입니다.\n다른 아이디를 사용해주세요.';
      }
      
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  };

  // 로그아웃 함수
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    
    dispatch({ type: 'LOGOUT' });
    console.log('🚪 로그아웃 완료');
  };

  // 에러 초기화 함수
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 비밀번호 변경 함수
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = state.token || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('로그인 정보가 없습니다. 다시 로그인해주세요.');
      }

      console.log('🔐 비밀번호 변경 요청 중...');

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
        console.log('✅ 비밀번호 변경 완료');
        return result;
      } else {
        const errorMessage = result.message || '비밀번호 변경에 실패했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 비밀번호 변경 실패:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다.\n다시 로그인해주세요.';
      } else if (error.message.includes('current password')) {
        errorMessage = '현재 비밀번호가 올바르지 않습니다.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // 사용자 정보 업데이트 함수
  const updateUserInfo = async (updateData) => {
    try {
      const token = state.token || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('로그인 정보가 없습니다. 다시 로그인해주세요.');
      }

      console.log('👤 사용자 정보 업데이트 요청 중...');

      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 업데이트된 사용자 정보를 상태에 반영
        const updatedUser = { ...state.user, ...result.data };
        
        // 스토리지 업데이트
        if (localStorage.getItem('userInfo')) {
          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        }
        if (sessionStorage.getItem('userInfo')) {
          sessionStorage.setItem('userInfo', JSON.stringify(updatedUser));
        }

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: updatedUser, token: state.token }
        });

        console.log('✅ 사용자 정보 업데이트 완료');
        return result;
      } else {
        const errorMessage = result.message || '사용자 정보 업데이트에 실패했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 사용자 정보 업데이트 실패:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.';
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = '인증이 만료되었습니다.\n다시 로그인해주세요.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // 토큰 유효성 검사 함수
  const validateToken = async () => {
    try {
      const token = state.token || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        console.log('⚠️ 토큰이 없습니다.');
        return false;
      }

      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const isValid = result.success;
        console.log(isValid ? '✅ 토큰이 유효합니다.' : '❌ 토큰이 유효하지 않습니다.');
        return isValid;
      }
      
      console.log('❌ 토큰 검증 응답 오류');
      return false;
    } catch (error) {
      console.error('❌ 토큰 검증 중 오류 발생:', error);
      return false;
    }
  };

  // Context value
  const contextValue = {
    // 상태
    ...state,
    
    // 함수들
    login,
    register,
    logout,
    clearError,
    changePassword,
    updateUserInfo,
    validateToken,
    
    // 유틸리티
    isLoggedIn: state.isAuthenticated && state.user && state.token,
    userRole: state.user?.role || 'user',
    userId: state.user?.user_id || null,
    userName: state.user?.charge_name || state.user?.user_id || null
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

// 기본 내보내기
export default AuthContext;