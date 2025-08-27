// server/fix-stores.js (새 파일 생성)
const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');

async function fixStoreData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv');
    
    console.log('🔧 Store 데이터 수정 시작...');
    
    // 기존 Store 데이터 모두 삭제 (선택사항)
    await Store.deleteMany({});
    console.log('🗑️ 기존 Store 데이터 삭제 완료');
    
    // 승인된 모든 사용자 조회
    const approvedUsers = await User.find({ status: 'approved' });
    console.log('✅ 승인된 사용자:', approvedUsers.length, '명');
    
    // 각 승인된 사용자에 대해 Store 엔트리 생성
    for (const user of approvedUsers) {
      try {
        const storeData = {
          storeName: user.cust_name,
          department: '여성', // 기본값
          storeCode: user.dept_name,
          address: user.dong_name + (user.dong_detail ? ' ' + user.dong_detail : ''),
          managerName: user.charge_name,
          managerPhone: user.tel_no,
          notes: `${user.user_id} 사용자로부터 재생성`,
          isActive: true
        };
        
        const newStore = new Store(storeData);
        await newStore.save();
        
        console.log('✅ Store 생성 완료:', {
          storeName: user.cust_name,
          managerName: user.charge_name,
          storeCode: user.dept_name
        });
        
      } catch (error) {
        console.error('❌ Store 생성 실패:', user.charge_name, error.message);
      }
    }
    
    // 최종 확인
    const finalStores = await Store.find();
    console.log('🎉 최종 Store 데이터:', finalStores.length, '개');
    finalStores.forEach(store => {
      console.log(`  - ${store.storeName}: ${store.managerName} (${store.storeCode})`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

fixStoreData();