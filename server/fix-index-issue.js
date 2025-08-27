// server/fix-index-issue.js (새 파일 생성)
const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexIssue = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv');
    console.log('✅ MongoDB 연결 성공');

    const db = mongoose.connection.db;

    // 현재 인덱스 확인
    const indexes = await db.collection('users').indexes();
    console.log('📋 현재 인덱스 목록:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // userId_1 인덱스가 있으면 제거
    const userIdIndex = indexes.find(idx => idx.name === 'userId_1');
    if (userIdIndex) {
      console.log('🗑️ userId_1 인덱스 제거 중...');
      await db.collection('users').dropIndex('userId_1');
      console.log('✅ userId_1 인덱스 제거 완료');
    } else {
      console.log('ℹ️ userId_1 인덱스가 존재하지 않음');
    }

    // userId 필드가 있는 문서들 확인
    const usersWithUserId = await db.collection('users').find({ userId: { $exists: true } }).toArray();
    console.log('📋 userId 필드가 있는 문서 수:', usersWithUserId.length);

    if (usersWithUserId.length > 0) {
      console.log('🗑️ userId 필드 제거 중...');
      await db.collection('users').updateMany(
        { userId: { $exists: true } },
        { $unset: { userId: 1 } }
      );
      console.log('✅ userId 필드 제거 완료');
    }

    // 최종 인덱스 확인
    const finalIndexes = await db.collection('users').indexes();
    console.log('📋 최종 인덱스 목록:');
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('✅ 인덱스 문제 해결 완료!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 인덱스 문제 해결 실패:', error);
    process.exit(1);
  }
};

fixIndexIssue();