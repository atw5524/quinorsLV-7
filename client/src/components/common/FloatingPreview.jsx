import React, { useState } from 'react';
import { useDelivery } from '../../context/DeliveryContext';

const FloatingPreview = ({ content, onEdit, show = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { deliveryType, originStore, destinationStore, currentStep } = useDelivery();

  if (!show) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 단계별 정보 구성
  const getStepInfo = () => {
    const steps = [];
    
    // 1단계: 배송 유형
    if (deliveryType) {
      steps.push({
        step: 1,
        title: '배송 유형',
        content: deliveryType,
        icon: 'fa-truck',
        completed: true
      });
    }
    
    // 2단계: 출발지
    if (originStore) {
      steps.push({
        step: 2,
        title: '출발지',
        content: originStore.name,
        detail: originStore.address,
        icon: 'fa-store',
        completed: true
      });
    }
    
    // 3단계: 도착지
    if (destinationStore) {
      steps.push({
        step: 3,
        title: '도착지',
        content: destinationStore.name,
        detail: destinationStore.address,
        icon: 'fa-map-marker-alt',
        completed: true
      });
    }

    // 현재 단계 표시 (미완료 단계)
    if (currentStep > steps.length) {
      const stepTitles = ['', '배송 유형', '출발지', '도착지', '배송 정보'];
      steps.push({
        step: currentStep,
        title: stepTitles[currentStep],
        content: '선택 중...',
        icon: 'fa-clock',
        completed: false,
        current: true
      });
    }

    return steps;
  };

  const stepInfo = getStepInfo();

  return (
    <>
      {/* 배경 오버레이 (확장될 때만) */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleExpanded}
        />
      )}

      {/* 좌측 슬라이드 패널 */}
      <div className={`fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* 메인 패널 */}
        <div className="h-full w-80 bg-white shadow-2xl flex flex-col">
          
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">선택 정보</h3>
              <button 
                onClick={toggleExpanded}
                className="text-white/80 hover:text-white transition-colors p-2"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <p className="text-white/80 text-sm mt-1">단계별 선택 내용</p>
          </div>

          {/* 단계별 정보 */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {stepInfo.map((step, index) => (
                <div key={step.step} className="relative">
                  
                  <div className="flex items-start gap-4">
                    {/* 단계 아이콘 */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed 
                        ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' 
                        : step.current
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <i className={`fa-solid ${step.icon}`}></i>
                    </div>

                    {/* 단계 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-bold ${
                          step.completed 
                            ? 'text-gray-800' 
                            : step.current
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }`}>
                          STEP {step.step}
                        </span>
                        {step.completed && (
                          <i className="fa-solid fa-check-circle text-green-500"></i>
                        )}
                        {step.current && (
                          <i className="fa-solid fa-clock text-blue-500"></i>
                        )}
                      </div>
                      
                      <h4 className={`font-semibold mb-1 ${
                        step.completed 
                          ? 'text-gray-800' 
                          : step.current
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}>
                        {step.title}
                      </h4>
                      
                      <p className={`text-sm ${
                        step.completed 
                          ? 'text-gray-700' 
                          : step.current
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}>
                        {step.content}
                      </p>
                      
                      {step.detail && (
                        <p className="text-xs text-gray-500 mt-1">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 연결선 */}
                  {index < stepInfo.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-6 bg-gray-200"></div>
                  )}
                </div>
              ))}
            </div>

            {/* 진행률 표시 */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 font-medium">전체 진행률</span>
                <span className="text-lg text-orange-600 font-bold">
                  {Math.round((stepInfo.filter(s => s.completed).length / 4) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(stepInfo.filter(s => s.completed).length / 4) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                {stepInfo.filter(s => s.completed).length} / 4 단계 완료
              </div>
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="space-y-3">
              <button 
                onClick={onEdit}
                className="w-full bg-white border-2 border-orange-500 text-orange-500 py-3 px-4 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
              >
                <i className="fa-solid fa-edit mr-2"></i>
                처음부터 다시 선택
              </button>
              <button 
                onClick={toggleExpanded}
                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <i className="fa-solid fa-check mr-2"></i>
                확인 완료
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 좌측 가장자리 탭 (항상 표시) */}
      <div className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ${
        isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button
          onClick={toggleExpanded}
          className="bg-gradient-to-r from-orange-400 to-orange-500 text-white p-3 rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <div className="flex flex-col items-center gap-1">
            <i className="fa-solid fa-chevron-right group-hover:translate-x-0.5 transition-transform"></i>
            <div className="writing-mode-vertical text-xs font-medium">
              선택정보
            </div>
            {stepInfo.filter(s => s.completed).length > 0 && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </div>
        </button>
      </div>
    </>
  );
};

export default FloatingPreview;