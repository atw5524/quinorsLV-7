// 사용자 ID 생성
const generateUserId = (storeCode, department = '') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  // 한글 부서명을 영문 약어로 변환
  let deptCode = '';
  if (department) {
    const departmentMap = {
      '여성': 'W',
      '남성': 'M', 
      '슈즈': 'S'
    };
    const deptAbbr = departmentMap[department] || department.substring(0, 1).toUpperCase();
    deptCode = `_${deptAbbr}`;
  }
  
  return `${storeCode}${deptCode}_${timestamp}${random}`;
};

// 임시 비밀번호 생성
const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 클라이언트 정보 추출
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null),
    userAgent: req.get('User-Agent') || 'Unknown'
  };
};

// User 계정 존재 여부 확인
const checkUserAccountsForDepartments = async (departments, storeCode) => {
  const User = require('../models/User');
  
  if (!departments || !Array.isArray(departments)) return departments;

  const updatedDepartments = [];

  for (const dept of departments) {
    // 해당 부서의 User 계정 존재 여부 확인
    const userExists = await User.findOne({
      storeCode: storeCode,
      department: dept.department,
      managerName: dept.managerName,
      phoneLast4: dept.phoneLast4,
      isActive: true
    });

    updatedDepartments.push({
      ...(dept.toObject ? dept.toObject() : dept),
      hasUserAccount: !!userExists,
      userAccountId: userExists ? userExists.userId : null,
      // 실제 계정 존재 여부로 accountIssued 업데이트
      accountIssued: !!userExists
    });
  }

  return updatedDepartments;
};

// 🎯 추가: 부서명 영문 약어 변환 유틸리티 함수
const getDepartmentCode = (department) => {
  const departmentMap = {
    '여성': 'W',
    '남성': 'M', 
    '슈즈': 'S'
  };
  return departmentMap[department] || department.substring(0, 1).toUpperCase();
};

module.exports = {
  generateUserId,
  generateTempPassword,
  getClientInfo,
  checkUserAccountsForDepartments,
  getDepartmentCode // 새로 추가된 함수
};