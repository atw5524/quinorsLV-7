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

  // 입력 데이터 검증 함수
  const validateFormData = () => {
    // 필수 필드 검증
    if (!formData.managerName.trim()) {
      alert('담당자명을 입력해주세요.');
      return false;
    }

    if (!formData.storeCode.trim()) {
      alert('매장코드를 입력해주세요.');
      return false;
    }

    if (!formData.phoneLast4.trim()) {
      alert('연락처 뒷 4자리를 입력해주세요.');
      return false;
    }

    // 담당자명 검증 - 더 관대한 검증
    const trimmedName = formData.managerName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 10) {
      alert('담당자명은 2-10자 이내로 입력해주세요.');
      return false;
    }

    // 한글이 포함되어 있는지 확인 (더 관대하게)
    const hasKorean = trimmedName.split('').some(char => {
      const code = char.charCodeAt(0);
      return (code >= 44032 && code <= 55203) || // 완성형 한글
             (code >= 12593 && code <= 12622) || // 한글 자음
             (code >= 12623 && code <= 12643);   // 한글 모음
    });

    if (!hasKorean) {
      alert('담당자명은 한글로 입력해주세요.');
      return false;
    }

    // 매장코드 검증 (영문 대문자와 숫자만 허용, 3-20자)
    const storeCodeRegex = /^[A-Z0-9]{3,20}$/;
    if (!storeCodeRegex.test(formData.storeCode.trim().toUpperCase())) {
      alert('매장코드는 영문 대문자와 숫자로 3-20자 이내로 입력해주세요.');
      return false;
    }

    // 연락처 뒷 4자리 검증
    if (formData.phoneLast4.length !== 4 || !/^\d{4}$/.test(formData.phoneLast4)) {
      alert('연락처 뒷 4자리를 정확히 입력해주세요. (숫자 4자리)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력 검증
    if (!validateFormData()) {
      return;
    }

    setIsLoading(true);
    try {
      // 서버 상태 확인
      const healthResponse = await fetch('https://quinors-lv-backend.ngrok.io/api/health');
      if (!healthResponse.ok) {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      // 계정 발급 신청
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/account-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          managerName: formData.managerName.trim(),
          storeCode: formData.storeCode.trim().toUpperCase(),
          phoneLast4: formData.phoneLast4.trim()
        }),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다.');
      }

      const result = await response.json();

      if (result.success) {
        // 자동 승인된 경우
        if (result.data.status === 'auto_approved') {
          setRequestResult({
            ...formData,
            requestId: result.data.requestId,
            requestDate: new Date(result.data.requestDate).toLocaleString('ko-KR'),
            status: 'auto_approved',
            userId: result.data.userId,
            tempPassword: result.data.tempPassword,
            storeName: result.data.storeName,
            processType: result.data.processType
          });
        } else {
          // 수동 승인 대기 상태
          setRequestResult({
            ...formData,
            requestId: result.data.requestId,
            requestDate: new Date(result.data.requestDate).toLocaleString('ko-KR'),
            status: 'pending'
          });
        }

        setShowResult(true);
      } else {
        // 자동 거부된 경우 또는 기타 오류
        if (result.data && result.data.status === 'rejected') {
          setRequestResult({
            ...formData,
            requestId: result.data.requestId,
            requestDate: new Date(result.data.requestDate).toLocaleString('ko-KR'),
            status: 'rejected',
            reason: result.data.reason || result.message
          });
          setShowResult(true);
        } else {
          alert(result.message || '신청 처리 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      // 구체적인 에러 메시지 제공
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        alert('서버에 연결할 수 없습니다.\n\n• 인터넷 연결을 확인해주세요\n• 서버가 정상 작동 중인지 확인해주세요\n• 잠시 후 다시 시도해주세요');
      } else if (error.message.includes('JSON')) {
        alert('서버 응답 처리 중 오류가 발생했습니다.\n고객센터에 문의해주세요.');
      } else {
        alert(`신청 처리 중 오류가 발생했습니다.\n\n오류: ${error.message}`);
      }
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

  // 매장코드 입력 처리 (대문자 변환)
  const handleStoreCodeInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setFormData(prev => ({
      ...prev,
      storeCode: value
    }));
  };

  // 🎯 개선된 담당자명 입력 처리
  const handleManagerNameInput = (e) => {
    const inputValue = e.target.value;
    
    // 한글 완성형 + 조합형 + 공백 모두 허용
    const koreanOnly = inputValue.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (
        // 한글 완성형 (가-힣)
        (code >= 44032 && code <= 55203) ||
        // 한글 자음 (ㄱ-ㅎ)
        (code >= 12593 && code <= 12622) ||
        // 한글 모음 (ㅏ-ㅣ)
        (code >= 12623 && code <= 12643) ||
        // 공백
        char === ' '
      );
    }).join('');
    
    // 최대 10자 제한
    const limitedValue = koreanOnly.slice(0, 10);
    
    setFormData(prev => ({
      ...prev,
      managerName: limitedValue
    }));
  };

  // 결과 상태에 따른 스타일 및 메시지
  const getResultStyle = () => {
    switch (requestResult?.status) {
      case 'auto_approved':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          titleColor: 'text-green-900',
          statusColor: 'text-green-600',
          statusText: '자동 승인 완료'
        };
      case 'rejected':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-900',
          statusColor: 'text-red-600',
          statusText: '신청 거부'
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-900',
          statusColor: 'text-yellow-600',
          statusText: '승인 대기중'
        };
    }
  };

  if (!isOpen) return null;

  const resultStyle = getResultStyle();

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
                    <p className="text-sm text-orange-700">
                      {!showResult ? 
                        '등록된 매장 정보와 일치하는 경우 즉시 계정이 발급됩니다. 불일치 시 관리자 승인이 필요합니다.' :
                        '신청이 완료되었습니다. 아래 결과를 확인해주세요.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {!showResult ? (
              <>
                {/* Form Section */}
                <section className="mb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 담당자명 입력 필드 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        담당자명 <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="managerName"
                        value={formData.managerName}
                        onChange={handleManagerNameInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" 
                        placeholder="담당자 이름 (한글만, 2-10자)"
                        required
                        disabled={isLoading}
                      />
                      <small className="text-gray-500 text-xs mt-1">한글로만 입력해주세요 (예: 김철수)</small>
                    </div>
                    
                    {/* 매장코드 입력 필드 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        매장코드 <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="storeCode"
                        value={formData.storeCode}
                        onChange={handleStoreCodeInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" 
                        placeholder="매장코드 (영문 대문자/숫자, 3-20자)"
                        required
                        disabled={isLoading}
                        maxLength="20"
                      />
                      <small className="text-gray-500 text-xs mt-1">영문 대문자와 숫자만 입력 가능합니다</small>
                    </div>
                    
                    {/* 연락처 뒷 4자리 입력 필드 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 뒷 4자리 <span className="text-red-500">*</span>
                      </label>
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
                      <small className="text-gray-500 text-xs mt-1">등록된 연락처의 뒷 4자리를 입력해주세요</small>
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
                        처리 중...
                      </div>
                    ) : (
                      '발급 신청하기'
                    )}
                  </button>
                </section>
              </>
            ) : (
              /* HTML과 100% 동일한 발급완료 UI */
              <>
                {/* Info Notice Box */}
                <div className="bg-orange-50 border border-orange-500/50 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-1 bg-orange-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <i className="fa-solid fa-info" style={{ fontSize: '10px' }}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-500">계정 발급 관련</h3>
                      <p className="text-sm text-gray-600 mt-1">신청이 완료되었습니다. 아래 결과를 확인해주세요.</p>
                    </div>
                  </div>
                </div>

                {/* Result Details Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                  {/* Result Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">계정 발급 완료!</h2>
                  </div>
                  
                  {/* Application Info */}
                  <div className="space-y-4 pt-5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">담당자명</span>
                      <span className="font-semibold text-gray-700">{requestResult?.managerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">매장코드</span>
                      <span className="font-semibold text-gray-700">{requestResult?.storeCode}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">연락처 뒷 4자리</span>
                      <span className="font-semibold text-gray-700">{requestResult?.phoneLast4}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">신청일시</span>
                      <span className="font-semibold text-gray-700">{requestResult?.requestDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">처리상태</span>
                      <span className="font-bold text-orange-500">자동 승인 완료</span>
                    </div>
                  </div>

                  {/* Issued Account Info */}
                  {requestResult?.status === 'auto_approved' && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h3 className="font-bold text-gray-700 mb-4">발급된 계정 정보</h3>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">사용자 ID</span>
                          <span className="font-semibold text-blue-600 cursor-pointer hover:underline">{requestResult?.userId}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">임시 비밀번호</span>
                          <span className="font-semibold text-red-500">{requestResult?.tempPassword}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">매장명</span>
                          <span className="font-semibold text-gray-700">{requestResult?.storeName}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Message */}
                <p className="text-xs text-center text-gray-400 px-4 mb-6">
                  계정이 자동으로 발급되었습니다. 발급된 계정 정보를 이용해 로그인해주세요.
                </p>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        {showResult ? (
          <footer className="p-6 border-t border-gray-200 bg-white flex-shrink-0">
            <button 
              onClick={handleClose}
              className="w-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all duration-300"
            >
              확인
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

export default AccountIssue;