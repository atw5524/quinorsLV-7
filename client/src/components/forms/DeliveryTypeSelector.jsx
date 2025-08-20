// components/forms/DeliveryTypeSelector.jsx
import React, { useState } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';

const DeliveryTypeSelector = () => {
  const context = useDelivery();
  
  // 안전성 체크 추가
  if (!context) {
    return <div>Loading...</div>;
  }

  const { deliveryType, dispatch } = context;
  const [selectedOption, setSelectedOption] = useState(deliveryType || '');

  const deliveryOptions = [
    {
      id: 'store-to-store',
      title: '매장 ↔ 매장',
      subtitle: '매장별 배송',
      icon: 'fa-store'
    },
    {
      id: 'store-to-customer',
      title: '매장 ↔ 고객',
      subtitle: '고객 배송',
      icon: 'fa-user'
    },
    {
      id: 'store-to-partner',
      title: '매장 ↔ 협력사',
      subtitle: '협력사 배송',
      icon: 'fa-handshake'
    }
  ];

  const handleOptionSelect = (option) => {
    setSelectedOption(option.title);
  };

  const handleNext = () => {
    if (selectedOption && dispatch) {
      dispatch({ type: 'SET_DELIVERY_TYPE', payload: selectedOption });
    }
  };

  const handleBack = () => {
    console.log('뒤로 가기');
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const handleEditPreview = () => {
    setSelectedOption('');
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
        
        <Header 
          title="배송 유형"
          subtitle="배송 유형을 선택해주세요"
          currentStep={1}
          onBack={handleBack}
          onClose={handleClose}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-4 overflow-y-auto pb-20">
          <div className="flex flex-col gap-4">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={`bg-white p-5 rounded-2xl border shadow-sm transition-all duration-300 cursor-pointer ${
                  selectedOption === option.title
                    ? 'border-orange-500 shadow-lg'
                    : 'border-gray-200 hover:border-orange-500 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                      <i className={`fa-solid ${option.icon} fa-xl`}></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {option.title}
                      </h3>
                      <p className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-1 mt-1 inline-block">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>
                  <i className="fa-solid fa-arrow-right text-gray-400"></i>
                </div>
              </div>
            ))}
          </div>
        </main>

        <FloatingPreview 
          content={selectedOption}
          onEdit={handleEditPreview}
          show={!!selectedOption}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleNext} disabled={!selectedOption}>
            다음 단계
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default DeliveryTypeSelector;