import React, { useState } from 'react';
import { useDelivery } from '../../context/DeliveryContext';
import Header from '../common/Header';
import FloatingPreview from '../common/FloatingPreview';
import Button from '../ui/Button';
import SearchInput from '../common/SearchInput';
import Card from '../ui/Card';

const DestinationStoreSelector = () => {
  const { deliveryType, originStore, destinationStore, dispatch } = useDelivery();
  const [selectedStore, setSelectedStore] = useState(destinationStore);
  const [searchTerm, setSearchTerm] = useState('');

  // 샘플 매장 데이터 (출발지와 다른 매장들)
  const stores = [
    {
      id: 4,
      name: '루이비통 명동점',
      address: '서울 중구 남대문로 63',
      hours: '영업중 • 10:30 - 20:00',
      distance: '4.2km'
    },
    {
      id: 5,
      name: '루이비통 신세계강남점',
      address: '서울 서초구 신반포로 176',
      hours: '영업중 • 10:30 - 20:00',
      distance: '2.1km'
    },
    {
      id: 6,
      name: '루이비통 현대판교점',
      address: '경기 성남시 분당구 판교역로 146',
      hours: '영업중 • 10:30 - 20:00',
      distance: '15.3km'
    }
  ].filter(store => store.id !== originStore?.id); // 출발지와 같은 매장 제외

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
  };

  const handleNext = () => {
    if (selectedStore && dispatch) {
      dispatch({ type: 'SET_DESTINATION_STORE', payload: selectedStore });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  const handleClose = () => {
    console.log('닫기');
  };

  const getPreviewContent = () => {
    if (originStore && selectedStore) {
      return `${deliveryType} • ${originStore.name} → ${selectedStore.name}`;
    }
    return deliveryType || '도착지 선택';
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-sans">
      <div className="w-full max-w-sm mx-auto bg-white shadow-lg rounded-3xl overflow-hidden h-screen max-h-[812px] flex flex-col relative">
        
        <Header 
          title="도착지 선택"
          subtitle="도착지 매장을 선택해주세요"
          currentStep={3}
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

export default DestinationStoreSelector;