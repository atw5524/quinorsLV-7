// server/create-admin.js
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv');
    console.log('✅ MongoDB 연결 성공');

    // 기존 관리자 계정 확인
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ 관리자 계정이 이미 존재합니다:', existingAdmin.user_id);
      process.exit(0);
    }

    // 관리자 계정 생성 (user_id를 6자 이상으로 변경)
    const adminUser = new User({
      user_id: 'admin123', // 6자 이상으로 변경
      password: 'admin123!',
      cust_name: '관리자 계정 시스템',
      dong_name: '서울시 강남구 테헤란로 123',
      dong_detail: '관리사무소',
      dept_name: 'ADMIN001',
      charge_name: '시스템관리자',
      tel_no: '01012345678',
      role: 'admin',
      status: 'approved',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ 관리자 계정 생성 완료!');
    console.log('📋 로그인 정보:');
    console.log('   아이디: admin123');
    console.log('   비밀번호: admin123!');
    console.log('   권한: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 관리자 계정 생성 실패:', error);
    process.exit(1);
  }
};

createAdmin();