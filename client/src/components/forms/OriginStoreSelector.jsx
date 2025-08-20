import React, { useState } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';
import SearchInput from '../common/SearchInput';
import Card from '../ui/Card';

const OriginStoreSelector = () => {
  const { deliveryType, originStore, dispatch } = useDelivery();
  const [selectedStore, setSelectedStore] = useState(originStore);
  const [searchTerm, setSearchTerm] = useState('');

  // 샘플 매장 데이터
  const stores = [
    {
      id: 1,
      name: '루이비통 강남점',
      address: '서울 강남구 압구정동 454',
      hours: '영업중 • 10:30 - 20:00',
      distance: '1.2km'
    },
    {
      id: 2,
      name: '루이비통 롯데월드타워점',
      address: '서울 송파구 올림픽로 300',
      hours: '영업중 • 10:30 - 20:00',
      distance: '2.8km'
    },
    {
      id: 3,
      name: '루이비통 현대백화점본점',
      address: '서울 중구 남대문로 63',
      hours: '영업중 • 10:30 - 20:00',
      distance: '3.5km'
    }
  ];

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
  };

  const handleNext = () => {
    if (selectedStore && dispatch) {
      dispatch({ type: 'SET_ORIGIN_STORE', payload: selectedStore });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 1 });
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const getPreviewContent = () => {
    if (selectedStore) {
      return `${deliveryType} • ${selectedStore.name}`;
    }
    return deliveryType || '출발지 선택';
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
        
        <Header 
          title="출발지 선택"
          subtitle="출발지 매장을 선택해주세요"
          currentStep={2}
          onBack={handleBack}
          onClose={handleClose}
        />

        <main className="flex-1 bg-gray-50 p-6 space-y-4 overflow-y-auto pb-20">
          <SearchInput 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="매장명으로 검색"
          />

          <div className="flex flex-col gap-4">
            {filteredStores.map((store) => (
              <Card
                key={store.id}
                selected={selectedStore?.id === store.id}
                onClick={() => handleStoreSelect(store)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      {store.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {store.address}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-green-600 bg-green-100 rounded-md px-2 py-1">
                        {store.hours}
                      </span>
                      <span className="text-xs text-gray-500">
                        {store.distance}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <FloatingPreview 
          content={getPreviewContent()}
          onEdit={() => dispatch({ type: 'SET_STEP', payload: 1 })}
          show={true}
        />

        <footer className="p-6 border-t border-gray-200 bg-white">
          <Button onClick={handleNext} disabled={!selectedStore}>
            다음 단계
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default OriginStoreSelector;