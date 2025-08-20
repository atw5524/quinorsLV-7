import React, { useState } from 'react';

const AccountIssue = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    managerName: '',
    storeCode: '',
    phoneLast4: ''
  });
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestResult, setRequestResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.managerName || !formData.storeCode || !formData.phoneLast4) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    
    if (formData.phoneLast4.length !== 4) {
      alert('연락처 뒷 4자리를 정확히 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(' https://quinors-lv-backend.ngrok.io/api/account-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setRequestResult({
          ...formData,
          requestId: result.data.requestId,
          requestDate: new Date(result.data.requestDate).toLocaleString('ko-KR'),
          status: 'pending'
        });
        setShowResult(true);
      } else {
        alert(result.message || '신청 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('신청 오류:', error);
      alert('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      managerName: '',
      storeCode: '',
      phoneLast4: ''
    });
    setShowResult(false);
    setRequestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({
      ...prev,
      phoneLast4: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">계정 발급</h1>
            <button 
              onClick={handleClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6">
            
            {/* Info Section */}
            <section className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-orange-900 mb-1">계정 발급 관련</h3>
                    <p className="text-sm text-orange-700">담당자 정보를 입력하여 계정 발급 신청해주세요. 관리자 승인 후 계정이 생성됩니다.</p>
                  </div>
                </div>
              </div>
            </section>

            {!showResult ? (
              <>
                {/* Form Section */}
                <section className="mb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">담당자명</label>
                      <input 
                        type="text" 
                        name="managerName"
                        value={formData.managerName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" 
                        placeholder="담당자 이름을 입력하세요"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">매장코드</label>
                      <input 
                        type="text" 
                        name="storeCode"
                        value={formData.storeCode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" 
                        placeholder="매장코드를 입력하세요"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">연락처 뒷 4자리</label>
                      <input 
                        type="text" 
                        name="phoneLast4"
                        value={formData.phoneLast4}
                        onChange={handlePhoneInput}
                        maxLength="4"
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" 
                        placeholder="0000"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </form>
                </section>

                {/* Button Section */}
                <section className="mb-6">
                  <button 
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 rounded-lg font-medium text-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        신청 중...
                      </div>
                    ) : (
                      '발급 신청하기'
                    )}
                  </button>
                </section>
              </>
            ) : (
              /* Result Section */
              <section className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-semibold text-blue-900">신청이 완료되었습니다</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                      <span className="text-sm font-medium text-gray-600">담당자명</span>
                      <span className="text-sm font-semibold text-gray-900">{requestResult?.managerName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                      <span className="text-sm font-medium text-gray-600">매장코드</span>
                      <span className="text-sm font-semibold text-gray-900">{requestResult?.storeCode}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                      <span className="text-sm font-medium text-gray-600">연락처 뒷 4자리</span>
                      <span className="text-sm font-semibold text-gray-900">{requestResult?.phoneLast4}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100">
                      <span className="text-sm font-medium text-gray-600">신청일시</span>
                      <span className="text-sm font-semibold text-gray-900">{requestResult?.requestDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">처리상태</span>
                      <span className="text-sm font-semibold text-yellow-600">승인 대기중</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      관리자 승인 후 계정 정보가 발급됩니다. 승인까지 1-2일 정도 소요될 수 있습니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    새로 신청하기
                  </button>
                  <button 
                    onClick={handleClose}
                    className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-lg font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200"
                  >
                    확인
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AccountIssue;