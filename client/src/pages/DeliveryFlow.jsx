import React from 'react';
import { useDelivery } from '../context/DeliveryContext';
import DeliveryTypeSelector from '../components/forms/DeliveryTypeSelector';
import OriginStoreSelector from '../components/forms/OriginStoreSelector';
import DestinationStoreSelector from '../components/forms/DestinationStoreSelector';
import DeliveryInfoForm from '../components/forms/DeliveryInfoForm';

const DeliveryFlow = () => {
  const context = useDelivery();
  
  if (!context) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden min-h-screen flex flex-col">
      <div className="h-4"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  const { currentStep } = context;

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <DeliveryTypeSelector />;
      case 2:
        return <OriginStoreSelector />;
      case 3:
        return <DestinationStoreSelector />;
      case 4:
        return <DeliveryInfoForm />;
      default:
        return <DeliveryTypeSelector />;
    }
  };

  return (
    <div>
      {renderCurrentStep()}
    </div>
  );
};

export default DeliveryFlow;