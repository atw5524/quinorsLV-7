import React from 'react';

const Card = ({ children, selected = false, onClick, className = '' }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border shadow-sm transition-all duration-300 cursor-pointer ${
        selected 
          ? 'border-orange-500 shadow-lg' 
          : 'border-gray-200 hover:border-orange-500 hover:shadow-lg'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;