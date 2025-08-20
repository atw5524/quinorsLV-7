import React from 'react';

const Header = ({ title, subtitle, currentStep, onBack, onClose }) => {
  const steps = [
    { number: 1, label: '배송유형' },
    { number: 2, label: '출발지' },
    { number: 3, label: '도착지' },
    { number: 4, label: '배송정보' }
  ];

  return (
    <header className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-500 text-white p-6 pt-12 rounded-b-2xl shadow-md relative">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="text-white opacity-90 hover:opacity-100 transition-opacity"
        >
          <i className="fa-solid fa-arrow-left fa-lg"></i>
        </button>
        <h1 className="text-2xl font-bold">{title}</h1>
        <button 
          onClick={onClose}
          className="text-white opacity-90 hover:opacity-100 transition-opacity"
        >
          <i className="fa-solid fa-xmark fa-lg"></i>
        </button>
      </div>
      <p className="text-center text-sm font-light opacity-80 mb-6">
        {subtitle}
      </p>
      
      {/* 개선된 단계별 네비게이션 */}
      <nav className="flex items-center justify-center px-2">
        <div className="flex items-center justify-between w-full max-w-xs">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* 단계 아이템 */}
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mb-1 transition-all duration-300
                  ${currentStep === step.number 
                    ? 'bg-white text-orange-500 shadow-md' 
                    : currentStep > step.number
                    ? 'bg-white/30 text-white'
                    : 'bg-white/20 text-white/70'
                  }
                `}>
                  {currentStep > step.number ? (
                    <i className="fa-solid fa-check text-xs"></i>
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`
                  text-xs font-medium text-center leading-tight whitespace-nowrap
                  ${currentStep === step.number 
                    ? 'text-white opacity-100' 
                    : currentStep > step.number
                    ? 'text-white opacity-90'
                    : 'text-white opacity-60'
                  }
                `}>
                  {step.label}
                </span>
              </div>

              {/* 연결선 (마지막 단계가 아닌 경우) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div className={`
                    h-0.5 transition-all duration-300
                    ${currentStep > step.number 
                      ? 'bg-white/50' 
                      : 'bg-white/20'
                    }
                  `}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;