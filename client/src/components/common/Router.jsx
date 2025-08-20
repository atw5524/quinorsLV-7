import React from 'react';

const Router = ({ currentRoute, children }) => {
  return (
    <div className="router">
      {children}
    </div>
  );
};

export default Router;