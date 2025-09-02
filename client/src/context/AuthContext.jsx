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
    case 'REGISTER_START':
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
    case 'REGISTER_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload
      };
      
    case 'REGISTER_SUCCESS':
      return { ...state, loading: false, error: null };
      
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
      
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload.user
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
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    
    if (token && userInfo) {
      try {
        const parsedUserInfo = JSON.parse(userInfo);
        console.log('🔄 세션 복원 중 - 사용자 정보:', parsedUserInfo);
        console.log('🔄 세션 복원 중 - tel_no 확인:', parsedUserInfo.tel_no);
        
        dispatch({
          type: 'RESTORE_SESSION',
          payload: {
            user: parsedUserInfo,
            token: token
          }
        });
        
        console.log('✅ 세션 복원 완료:', {
          user_id: parsedUserInfo.user_id,
          charge_name: parsedUserInfo.charge_name,
          cust_name: parsedUserInfo.cust_name,
          tel_no: parsedUserInfo.tel_no
        });
        
        // 🎯 세션 복원 후 tel_no가 없으면 즉시 업데이트 시도
        if (!parsedUserInfo.tel_no) {
          console.log('🔄 세션 복원 후 tel_no가 없어서 즉시 업데이트 시도');
          setTimeout(() => {
            fetchAndUpdateUserInfo(parsedUserInfo.user_id, token);
          }, 100);
        }
        
      } catch (error) {
        console.error('❌ 세션 복원 중 오류 발생:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userInfo');
      }
    }
  }, []);

  // 🔄 사용자 정보 가져오기 및 업데이트 함수 (내부 함수)
  const fetchAndUpdateUserInfo = async (userId, authToken) => {
    try {
      console.log('🔄 사용자 정보 가져오기 시작:', userId);
      
      // DeliveryTypeSelector에서 사용하는 것과 동일한 API 사용
      const response = await fetch(`https://quinors-lv-backend.ngrok.io/api/auth/stores/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 사용자 정보 가져오기 성공:', result);
        
        if (result.success && result.data) {
          const fullUserData = result.data;
          
          // 기존 사용자 정보와 병합
          const updatedUser = {
            ...state.user,
            ...fullUserData,
            // tel_no 필드 확실히 업데이트
            tel_no: fullUserData.tel_no || state.user?.tel_no || ''
          };

          console.log('🎯 업데이트된 사용자 정보:', updatedUser);
          console.log('🎯 업데이트된 tel_no:', updatedUser.tel_no);
          
          // 상태 업데이트
          dispatch({
            type: 'UPDATE_USER',
            payload: { user: updatedUser }
          });

          // 스토리지도 업데이트
          const storageData = JSON.stringify(updatedUser);
          if (localStorage.getItem('authToken')) {
            localStorage.setItem('userInfo', storageData);
            console.log('💾 localStorage 업데이트 완료');
          } else if (sessionStorage.getItem('authToken')) {
            sessionStorage.setItem('userInfo', storageData);
            console.log('💾 sessionStorage 업데이트 완료');
          }

          return updatedUser;
        }
      } else {
        console.warn('⚠️ 사용자 정보 가져오기 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 사용자 정보 가져오기 오류:', error);
    }
  };

  // 🔐 로그인 함수
  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('🔐 로그인 시도 중:', { user_id: credentials.username });
      
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
          user_id: credentials.username,
          password: credentials.password,
          rememberMe: credentials.rememberMe || false
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다. 관리자에게 문의하세요.');
      }

      const result = await response.json();
      console.log('📋 로그인 API 원본 응답:', result);

      if (response.ok && result.success) {
        // 🎯 사용자 정보 추출 및 정규화
        let userData;
        
        if (result.data && result.data.user) {
          userData = result.data.user;
        } else if (result.user) {
          userData = result.user;
        } else if (result.data) {
          userData = result.data;
        } else {
          throw new Error('서버 응답에서 사용자 정보를 찾을 수 없습니다');
        }

        console.log('🔍 추출된 원본 userData:', userData);
        console.log('🔍 원본 userData.tel_no:', userData.tel_no, typeof userData.tel_no);

        // 🎯 의뢰자 정보 필드들 확실히 포함 - 수정됨
        const normalizedUser = {
          _id: userData._id,
          user_id: userData.user_id,
          // 의뢰자 정보 (API 접수용)
          cust_name: userData.cust_name || '',
          dept_name: userData.dept_name || '',
          charge_name: userData.charge_name || '',
          tel_no: userData.tel_no || '', // 🎯 이 부분이 핵심
          // 기타 정보
          role: userData.role || 'user',
          status: userData.status || 'active',
          department: userData.department,
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLoginAt: userData.lastLoginAt,
          // 추가 필드들도 포함
          dong_name: userData.dong_name,
          dong_detail: userData.dong_detail,
          notes: userData.notes,
          processedAt: userData.processedAt
        };

        const token = result.data?.token || result.token;
        
        console.log('✅ 정규화된 사용자 정보:', normalizedUser);
        console.log('🔍 정규화 후 tel_no 확인:', {
          original: userData.tel_no,
          normalized: normalizedUser.tel_no,
          type: typeof normalizedUser.tel_no,
          length: normalizedUser.tel_no ? normalizedUser.tel_no.length : 0
        });

        // 🎯 tel_no가 없으면 즉시 추가 정보 가져오기
        let finalUser = normalizedUser;
        if (!normalizedUser.tel_no) {
          console.log('🔄 로그인 후 tel_no가 없어서 추가 정보 가져오기');
          const fullUserData = await fetchAndUpdateUserInfo(normalizedUser.user_id, token);
          if (fullUserData) {
            finalUser = fullUserData;
          }
        }

        // 로컬/세션 스토리지에 저장
        const storageData = JSON.stringify(finalUser);
        
        if (credentials.rememberMe) {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userInfo', storageData);
          console.log('💾 localStorage에 저장 완료');
        } else {
          sessionStorage.setItem('authToken', token);
          sessionStorage.setItem('userInfo', storageData);
          console.log('💾 sessionStorage에 저장 완료');
        }

        // 상태 업데이트
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { 
            user: finalUser, 
            token: token 
          }
        });
        
        console.log('✅ 로그인 성공:', {
          user_id: finalUser.user_id,
          charge_name: finalUser.charge_name,
          cust_name: finalUser.cust_name,
          tel_no: finalUser.tel_no
        });

        return { success: true, user: finalUser };

      } else {
        const errorMessage = result.message || '아이디 또는 비밀번호가 올바르지 않습니다.';
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ 로그인 실패:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n• 인터넷 연결을 확인해주세요\n• 서버 상태를 확인해주세요\n• 잠시 후 다시 시도해주세요';
      } else if (error.message.includes('JSON')) {
        errorMessage = '서버 응답 처리 중 오류가 발생했습니다.\n관리자에게 문의해주세요.';
      }

      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  };

  // 📝 회원가입 함수
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
        body: JSON.stringify(registerData)
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
        const errorMessage = result.message || '회원가입 처리 중 오류가 발생했습니다.';
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다.\n• 인터넷 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요';
      } else if (error.message.includes('duplicate') || error.message.includes('중복')) {
        errorMessage = '이미 사용 중인 정보입니다.\n다른 정보를 사용해주세요.';
      }

      dispatch({
        type: 'REGISTER_FAILURE',
        payload: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  };

  // 🔄 사용자 정보 업데이트 함수 (외부 호출용)
  const updateUserInfo = async () => {
    if (!state.user || !state.token) {
      console.warn('⚠️ 사용자 정보 또는 토큰이 없습니다');
      return;
    }

    return await fetchAndUpdateUserInfo(state.user.user_id, state.token);
  };

  // 🚪 로그아웃 함수
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    
    dispatch({ type: 'LOGOUT' });
    console.log('🚪 로그아웃 완료');
  };

  // ❌ 에러 초기화 함수
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
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
    updateUserInfo,
    
    // 유틸리티
    isLoggedIn: state.isAuthenticated && state.user && state.token,
    userRole: state.user?.role || 'user',
    userId: state.user?.user_id || null,
    userName: state.user?.charge_name || state.user?.user_id || null,
    isAdmin: state.user?.role === 'admin',
    
    // 🎯 의뢰자 정보 직접 접근 (API 접수용) - 수정됨
    requesterInfo: state.user ? {
      custName: state.user.cust_name || '',
      deptName: state.user.dept_name || '',
      chargeName: state.user.charge_name || '',
      telNo: state.user.tel_no || '' // 🎯 여기서 tel_no를 제대로 가져옴
    } : null
  };

  // 디버깅용 로그 (개발환경에서만)
  if (process.env.NODE_ENV === 'development' && state.user) {
    console.log('🔍 AuthContext contextValue.requesterInfo:', contextValue.requesterInfo);
    console.log('🔍 AuthContext state.user.tel_no:', state.user.tel_no);
  }

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

export default AuthContext;