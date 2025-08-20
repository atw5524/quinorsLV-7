import React from 'react';

const SearchInput = ({ placeholder, value, onChange }) => {
  return (
    <div className="relative mb-4">
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 pr-12 bg-white rounded-xl border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      />
      <i className="fa-solid fa-search absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
    </div>
  );
};

export default SearchInput;