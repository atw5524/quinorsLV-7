import React, { useState, useEffect } from 'react';

const Register = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    password: '',
    password_confirm: '',
    cust_name: '',        // 기본 매장명
    department: '여성',    // 매장구분 선택
    dong_name: '',
    dong_detail: '',
    dept_name: '',        // 매장코드 (수동 입력)
    charge_name: '',
    tel_no: ''
  });
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestResult, setRequestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 다음 우편번호 API 로드
  useEffect(() => {
    if (isOpen && !window.daum) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 다음 우편번호 API 실행
  const handleAddressSearch = () => {
    if (!window.daum) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data) {
        let addr = '';
        let extraAddr = '';

        if (data.userSelectedType === 'R') {
          addr = data.roadAddress;
        } else {
          addr = data.jibunAddress;
        }

        if(data.userSelectedType === 'R'){
          if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
            extraAddr += data.bname;
          }
          if(data.buildingName !== '' && data.apartment === 'Y'){
            extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          if(extraAddr !== ''){
            extraAddr = ' (' + extraAddr + ')';
          }
          addr += extraAddr;
        }

        setFormData(prev => ({
          ...prev,
          dong_name: addr
        }));
      }
    }).open();
  };

  // 전화번호 포맷팅
  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = value;
    
    if (value.length <= 3) {
      formattedValue = value;
    } else if (value.length <= 7) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length <= 11) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
    }
    
    setFormData(prev => ({
      ...prev,
      tel_no: formattedValue
    }));
  };

  // 아이디 입력 처리 (영문, 숫자만)
  const handleUserIdInput = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      user_id: value
    }));
  };

  // 매장코드 입력 처리 (영문 대문자, 숫자만)
  const handleDeptNameInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      dept_name: value
    }));
  };

  // 담당자명 입력 처리 (한글만)
  const handleChargeNameInput = (e) => {
    const inputValue = e.target.value;
    const koreanOnly = inputValue.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (
        (code >= 44032 && code <= 55203) ||
        (code >= 12593 && code <= 12622) ||
        (code >= 12623 && code <= 12643) ||
        char === ' '
      );
    }).join('');
    
    const limitedValue = koreanOnly.slice(0, 10);
    setFormData(prev => ({
      ...prev,
      charge_name: limitedValue
    }));
  };

  // 입력 데이터 검증 함수
  const validateFormData = () => {
    // 필수 필드 검증
    if (!formData.user_id.trim()) {
      alert('아이디를 입력해주세요.');
      return false;
    }
    if (!formData.password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return false;
    }
    if (!formData.password_confirm.trim()) {
      alert('비밀번호 확인을 입력해주세요.');
      return false;
    }
    if (!formData.cust_name.trim()) {
      alert('매장명을 입력해주세요.');
      return false;
    }
    if (!formData.department.trim()) {
      alert('매장구분을 선택해주세요.');
      return false;
    }
    if (!formData.dong_name.trim()) {
      alert('주소를 입력해주세요.');
      return false;
    }
    if (!formData.dept_name.trim()) {
      alert('매장코드를 입력해주세요.');
      return false;
    }
    if (!formData.charge_name.trim()) {
      alert('담당자명을 입력해주세요.');
      return false;
    }
    if (!formData.tel_no.trim()) {
      alert('연락처를 입력해주세요.');
      return false;
    }

    // 아이디 검증 (영문, 숫자 6-20자)
    if (formData.user_id.length < 6 || formData.user_id.length > 20) {
      alert('아이디는 6-20자 이내로 입력해주세요.');
      return false;
    }
    if (!/^[a-z0-9]+$/.test(formData.user_id)) {
      alert('아이디는 영문 소문자와 숫자만 사용 가능합니다.');
      return false;
    }

    // 비밀번호 검증
    if (formData.password.length < 8) {
      alert('비밀번호는 8자리 이상이어야 합니다.');
      return false;
    }
    if (formData.password !== formData.password_confirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return false;
    }

    // 연락처 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.tel_no)) {
      alert('올바른 휴대폰 번호 형식으로 입력해주세요. (010-0000-0000)');
      return false;
    }

    // 매장코드 검증
    if (formData.dept_name.length < 3 || formData.dept_name.length > 20) {
      alert('매장코드는 3-20자 이내로 입력해주세요.');
      return false;
    }

    // 담당자명 검증
    if (formData.charge_name.length < 2) {
      alert('담당자명은 2자 이상 입력해주세요.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateFormData()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 회원가입 요청 중:', { user_id: formData.user_id });
      
      // 서버 상태 확인
      const healthResponse = await fetch('https://quinors-lv-backend.ngrok.io/api/health');
      if (!healthResponse.ok) {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      // 회원가입 API 호출
      const response = await fetch('https://quinors-lv-backend.ngrok.io/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: formData.user_id.trim(),
          password: formData.password.trim(),
          cust_name: `${formData.cust_name.trim()} ${formData.department}`, // 매장명 + 매장구분
          dong_name: formData.dong_name.trim(),
          dong_detail: formData.dong_detail.trim(),
          dept_name: formData.dept_name.trim(),
          charge_name: formData.charge_name.trim(),
          tel_no: formData.tel_no.replace(/[^0-9]/g, '') // 숫자만 저장
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다. 관리자에게 문의하세요.');
      }

      const result = await response.json();
      console.log('📋 회원가입 응답 확인:', result);

      if (response.ok && result.success) {
        setRequestResult({
          ...formData,
          fullStoreName: `${formData.cust_name} ${formData.department}`, // 전체 매장명
          requestId: result.data.requestId,
          requestDate: new Date(result.data.requestDate).toLocaleString('ko-KR'),
          status: 'pending'
        });
        setShowResult(true);
        console.log('✅ 회원가입 신청 완료:', formData.user_id);
      } else {
        // 서버에서 제공하는 한국어 메시지 우선 사용
        const errorMessage = result.message || '회원가입 처리 중 오류가 발생했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ 회원가입 실패:', error);
      
      // 구체적인 한국어 에러 메시지 처리
      let errorMessage = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n• 인터넷 연결을 확인해주세요\n• 서버 상태를 확인해주세요\n• 잠시 후 다시 시도해주세요';
      } else if (error.message.includes('JSON')) {
        errorMessage = '서버 응답 처리 중 오류가 발생했습니다.\n관리자에게 문의해주세요.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = '네트워크 연결에 문제가 있습니다.\n인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('duplicate') || error.message.includes('중복')) {
        errorMessage = '이미 사용 중인 아이디입니다.\n다른 아이디를 사용해주세요.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      password: '',
      password_confirm: '',
      cust_name: '',
      department: '여성',
      dong_name: '',
      dong_detail: '',
      dept_name: '',
      charge_name: '',
      tel_no: ''
    });
    setShowResult(false);
    setRequestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">회원가입</h1>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
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
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <h3 className="font-medium text-orange-900 mb-1">회원가입 안내</h3>
                    <p className="text-sm text-orange-700">
                      {!showResult ? 
                        '필요한 정보를 입력하여 회원가입을 진행해주세요. 관리자 승인 후 로그인이 가능합니다.' :
                        '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {!showResult ? (
              <>
                {/* Form Section - 순서: 아이디, 비밀번호, 비밀번호확인, 매장명, 매장구분, 주소, 매장코드, 담당자명, 휴대폰번호 */}
                <section className="mb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* 1. 아이디 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        아이디 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="user_id"
                        value={formData.user_id}
                        onChange={handleUserIdInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="영문 소문자, 숫자 (6-20자)"
                        required
                        disabled={isLoading}
                        maxLength="20"
                      />
                      <small className="text-gray-500 text-xs mt-1">영문 소문자와 숫자만 사용 가능합니다</small>
                    </div>

                    {/* 2. 비밀번호 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        비밀번호 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                          placeholder="8자리 이상 입력"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 576 512">
                            {showPassword ? (
                              <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1z"/>
                            ) : (
                              <path d="m288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32z"/>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* 3. 비밀번호 확인 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        비밀번호 확인 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswordConfirm ? "text" : "password"}
                          name="password_confirm"
                          value={formData.password_confirm}
                          onChange={handleInputChange}
                          className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                          placeholder="비밀번호를 다시 입력하세요"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 576 512">
                            {showPasswordConfirm ? (
                              <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1z"/>
                            ) : (
                              <path d="m288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32z"/>
                            )}
                          </svg>
                        </button>
                      </div>
                      {formData.password && formData.password_confirm && formData.password !== formData.password_confirm && (
                        <small className="text-red-500 text-xs mt-1">비밀번호가 일치하지 않습니다</small>
                      )}
                    </div>

                    {/* 4. 매장명 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        매장명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="cust_name"
                        value={formData.cust_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="매장명을 입력하세요 (예: 강남점)"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* 5. 매장구분 선택 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        매장구분 <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        required
                        disabled={isLoading}
                      >
                        <option value="여성">여성</option>
                        <option value="남성">남성</option>
                        <option value="슈즈">슈즈</option>
                      </select>
                      <small className="text-gray-500 text-xs mt-1">담당하실 매장구분을 선택해주세요</small>
                    </div>

                    {/* 6. 주소 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        주소 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="dong_name"
                          value={formData.dong_name}
                          readOnly
                          className="flex-1 px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                          placeholder="주소 검색을 클릭하세요"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleAddressSearch}
                          className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap"
                          disabled={isLoading}
                        >
                          주소검색
                        </button>
                      </div>
                      <input
                        type="text"
                        name="dong_detail"
                        value={formData.dong_detail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all mt-2"
                        placeholder="상세주소를 입력하세요 (선택사항)"
                        disabled={isLoading}
                      />
                    </div>

                    {/* 7. 매장코드 (수동 입력) */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        매장코드 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="dept_name"
                        value={formData.dept_name}
                        onChange={handleDeptNameInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="매장코드를 입력하세요 (예: ST001W)"
                        required
                        disabled={isLoading}
                        maxLength="20"
                      />
                      <small className="text-gray-500 text-xs mt-1">영문 대문자와 숫자만 입력 가능합니다</small>
                    </div>

                    {/* 8. 담당자명 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        담당자명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="charge_name"
                        value={formData.charge_name}
                        onChange={handleChargeNameInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="담당자 이름 (한글, 2-10자)"
                        required
                        disabled={isLoading}
                      />
                      <small className="text-gray-500 text-xs mt-1">한글로만 입력해주세요</small>
                    </div>

                    {/* 9. 휴대폰번호 */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        휴대폰 번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="tel_no"
                        value={formData.tel_no}
                        onChange={handlePhoneInput}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="010-0000-0000"
                        required
                        disabled={isLoading}
                        maxLength="13"
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
                        처리 중...
                      </div>
                    ) : (
                      '회원가입'
                    )}
                  </button>
                </section>
              </>
            ) : (
              /* 회원가입 완료 결과 */
              <>
                <div className="bg-orange-50 border border-orange-500/50 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-1 bg-orange-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-500">회원가입 완료</h3>
                      <p className="text-sm text-gray-600 mt-1">회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">가입 신청 완료</h2>
                  </div>

                  <div className="space-y-4 pt-5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">아이디</span>
                      <span className="font-semibold text-gray-700">{requestResult?.user_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">매장명</span>
                      <span className="font-semibold text-gray-700">{requestResult?.fullStoreName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">담당자명</span>
                      <span className="font-semibold text-gray-700">{requestResult?.charge_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">신청일시</span>
                      <span className="font-semibold text-gray-700">{requestResult?.requestDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">처리상태</span>
                      <span className="font-bold text-blue-500">승인 대기중</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-gray-400 px-4 mb-6">
                  관리자 승인 후 로그인이 가능합니다. 승인까지 시간이 걸릴 수 있으니 양해 부탁드립니다.
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

export default Register;