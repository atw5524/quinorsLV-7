import React, { useState } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';

const DeliveryInfoForm = () => {
  const { deliveryType, originStore, destinationStore, dispatch } = useDelivery();
  
  // 물품 정보 상태
  const [selectedItem, setSelectedItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  
  // 배송 옵션 상태
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [needsCarrier, setNeedsCarrier] = useState(false);
  const [deliveryRoute, setDeliveryRoute] = useState('');
  const [specialOption, setSpecialOption] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // 상품 상세 정보 상태
  const [productDetails, setProductDetails] = useState({
    productNumber: '',
    orderNumber: '',
    ticketNumber: '',
    register: '',
    requestNotes: ''
  });
  const [noProductNumber, setNoProductNumber] = useState(false);

  const itemOptions = [
    { id: 'bag', label: '쇼핑백', icon: 'fa-shopping-bag' },
    { id: 'clothes', label: '옷,유니폼', icon: 'fa-shirt' }, // 👈 핸드백 → 옷,유니폼으로 변경
    { id: 'etc', label: '기타', icon: 'fa-box' }
  ];

  const deliveryMethods = [
    { id: 'motorcycle', label: '오토바이', icon: 'fa-motorcycle', weight: '최대 5kg' },
    { id: 'damas', label: '다마스', icon: 'fa-truck', weight: '최대 350kg' }
  ];

  const routeOptions = [
    { id: 'oneway', label: '편도', icon: 'fa-arrow-right' },
    { id: 'roundtrip', label: '왕복', icon: 'fa-arrows-left-right' }
  ];

  const specialOptions = [
    { id: 'none', label: '없음', icon: 'fa-check' },
    { id: 'express', label: '급송', icon: 'fa-bolt' },
    { id: 'scheduled', label: '예약', icon: 'fa-calendar' }
  ];

  const handleItemSelect = (itemId) => {
    setSelectedItem(itemId);
    if (itemId !== 'etc') {
      setCustomItem('');
    }
  };

  const handleDeliveryMethodSelect = (methodId) => {
    setDeliveryMethod(methodId);
    if (methodId !== 'motorcycle') {
      setNeedsCarrier(false);
    }
  };

  const handleSpecialOptionSelect = (optionId) => {
    setSpecialOption(optionId);
    if (optionId !== 'scheduled') {
      setScheduleDate('');
      setScheduleTime('');
    }
  };

  const handleProductDetailsChange = (field, value) => {
    setProductDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNoProductNumberChange = (checked) => {
    setNoProductNumber(checked);
    if (checked) {
      setProductDetails(prev => ({ ...prev, productNumber: '' }));
    }
  };

  const handleSubmit = () => {
    const deliveryInfo = {
      item: selectedItem === 'etc' ? customItem : selectedItem,
      deliveryMethod,
      needsCarrier,
      deliveryRoute,
      specialOption,
      scheduleDate,
      scheduleTime,
      productDetails: {
        ...productDetails,
        noProductNumber
      }
    };

    console.log('배송 요청:', {
      deliveryType,
      originStore,
      destinationStore,
      deliveryInfo
    });

    alert('배송 요청이 완료되었습니다!');
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 3 });
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const getPreviewContent = () => {
    if (originStore && destinationStore) {
      return `${deliveryType} • ${originStore.name} → ${destinationStore.name}`;
    }
    return deliveryType || '배송 정보';
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col">
        
        <Header 
          title="배송 정보 입력"
          subtitle="물품 정보와 배송 옵션을 선택해주세요"
          currentStep={4}
          onBack={handleBack}
          onClose={handleClose}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto pb-20">
          
          {/* 물품 정보 섹션 */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">물품 정보</h3>
            <div className="grid grid-cols-3 gap-3">
              {itemOptions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                    selectedItem === item.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-500'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} text-2xl text-gray-600 mb-2`}></i>
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  
                  {item.id === 'etc' && selectedItem === 'etc' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customItem}
                        onChange={(e) => setCustomItem(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        placeholder="책 한권"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 배송 옵션 섹션 */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">배송 옵션</h3>
            
            <div className="space-y-4">
              {/* 배송 수단 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">배송 수단</h4>
                <div className="space-y-3">
                  {deliveryMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                        deliveryMethod === method.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                      onClick={() => handleDeliveryMethodSelect(method.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <i className={`fa-solid ${method.icon} text-xl text-orange-500`}></i>
                          <div>
                            <span className="font-medium text-gray-800">{method.label}</span>
                            <p className="text-xs text-gray-500">{method.weight}</p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="delivery-method"
                          checked={deliveryMethod === method.id}
                          onChange={() => handleDeliveryMethodSelect(method.id)}
                          className="text-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      
                      {method.id === 'motorcycle' && deliveryMethod === 'motorcycle' && (
                        <div className="ml-8">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={needsCarrier}
                              onChange={(e) => setNeedsCarrier(e.target.checked)}
                              className="text-orange-500 focus:ring-orange-500 rounded"
                            />
                            <div>
                              <span className="text-sm text-gray-600">짐받이 필요</span>
                              <p className="text-xs text-gray-400">최대 15kg</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 배송 경로 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">배송 경로</h4>
                <div className="grid grid-cols-2 gap-3">
                  {routeOptions.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setDeliveryRoute(route.id)}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                        deliveryRoute === route.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                    >
                      <i className={`fa-solid ${route.icon} text-xl text-gray-600 mb-2`}></i>
                      <p className="text-sm font-medium text-gray-700">{route.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 기타 옵션 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">기타 옵션</h4>
                <div className="grid grid-cols-3 gap-3">
                  {specialOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleSpecialOptionSelect(option.id)}
                      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer text-center ${
                        specialOption === option.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-500'
                      }`}
                    >
                      <i className={`fa-solid ${option.icon} text-xl text-gray-600 mb-2`}></i>
                      <p className="text-sm font-medium text-gray-700">{option.label}</p>
                    </div>
                  ))}
                </div>

                {/* 예약 일시 선택 */}
                {specialOption === 'scheduled' && (
                  <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">예약 일시 선택</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">날짜</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">시간</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 상품 상세 정보 섹션 */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">제품 상세 정보</h3>
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
              
              {/* 제품번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제품번호</label>
                <input
                  type="text"
                  value={productDetails.productNumber}
                  onChange={(e) => handleProductDetailsChange('productNumber', e.target.value)}
                  disabled={noProductNumber}
                  className={`w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                    noProductNumber ? 'bg-gray-100' : ''
                  }`}
                  placeholder="제품번호를 입력하세요"
                />
                <label className="flex items-center mt-2 gap-2">
                  <input
                    type="checkbox"
                    checked={noProductNumber}
                    onChange={(e) => handleNoProductNumberChange(e.target.checked)}
                    className="text-orange-500 focus:ring-orange-500 rounded"
                  />
                  <span className="text-xs text-gray-600">제품번호 없음</span>
                </label>
              </div>

              {/* 오더번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">오더번호</label>
                <input
                  type="text"
                  value={productDetails.orderNumber}
                  onChange={(e) => handleProductDetailsChange('orderNumber', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="오더번호를 입력하세요"
                />
              </div>

              {/* 티켓번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">티켓번호</label>
                <input
                  type="text"
                  value={productDetails.ticketNumber}
                  onChange={(e) => handleProductDetailsChange('ticketNumber', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="티켓번호를 입력하세요"
                />
              </div>

              {/* 레지스터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">레지스터</label>
                <input
                  type="text"
                  value={productDetails.register}
                  onChange={(e) => handleProductDetailsChange('register', e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  placeholder="레지스터를 입력하세요"
                />
              </div>

              {/* 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  요청사항
                  {noProductNumber && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  value={productDetails.requestNotes}
                  onChange={(e) => handleProductDetailsChange('requestNotes', e.target.value)}
                  required={noProductNumber}
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 h-20 resize-none"
                  placeholder="요청사항을 입력하세요"
                />
              </div>
            </div>
          </section>
        </main>

        <FloatingPreview 
          content={getPreviewContent()}
          onEdit={() => dispatch({ type: 'SET_STEP', payload: 1 })}
          show={true}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleSubmit}>
            배송 요청하기
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default DeliveryInfoForm;