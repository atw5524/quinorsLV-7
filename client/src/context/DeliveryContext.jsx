import React, { createContext, useContext, useReducer, useMemo } from 'react';

const DeliveryContext = createContext(null);

const initialState = {
  isAuthenticated: false,
  user: null,
  deliveryType: '',
  originStore: null,
  destinationStore: null,
  deliveryInfo: null,
  currentStep: 1
};

const deliveryReducer = (state, action) => {
  switch (action.type) {
    case 'SET_DELIVERY_TYPE':
      return { ...state, deliveryType: action.payload, currentStep: 2 };
    case 'SET_ORIGIN_STORE':
      return { ...state, originStore: action.payload, currentStep: 3 };
    case 'SET_DESTINATION_STORE':
      return { ...state, destinationStore: action.payload, currentStep: 4 };
    case 'SET_DELIVERY_INFO':
      return { ...state, deliveryInfo: action.payload };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, isAuthenticated: true, user: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

export const DeliveryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(deliveryReducer, initialState);

  const login = async (credentials) => {
    try {
      const response = await new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            user: {
              id: 1,
              email: credentials.email,
              name: '사용자',
              role: 'business'
            },
            token: 'fake-jwt-token'
          });
        }, 1000);
      });

      if (credentials.rememberMe) {
        localStorage.setItem('token', response.token);
      } else {
        sessionStorage.setItem('token', response.token);
      }

      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const contextValue = useMemo(() => ({
    ...state,
    dispatch,
    login,
    logout
  }), [state]);

  return (
    <DeliveryContext.Provider value={contextValue}>
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  
  if (!context) {
    throw new Error(
      '🚨 useDelivery must be used within DeliveryProvider!\n' +
      '💡 Wrap your component with <DeliveryProvider>...</DeliveryProvider>'
    );
  }
  
  return context;
};