import React from 'react';

const Button = ({ children, onClick, disabled = false, className = '' }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;