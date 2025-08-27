// server/fix-missing-store.js
const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');

async function fixMissingStore() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv');
    
    console.log('🔧 누락된 Store 데이터 수정 시작...');
    
    // 승인된 사용자 중 Store에 없는 사용자 찾기
    const approvedUsers = await User.find({ status: 'approved' });
    console.log('✅ 승인된 사용자:', approvedUsers.length, '명');
    
    for (const user of approvedUsers) {
      // 해당 사용자의 Store 엔트리가 있는지 확인
      const existingStore = await Store.findOne({
        storeCode: user.dept_name,
        managerName: user.charge_name,
        managerPhone: user.tel_no
      });
      
      if (!existingStore) {
        console.log('❌ Store 엔트리 누락:', user.charge_name, user.dept_name);
        
        try {
          const newStore = new Store({
            storeName: user.cust_name,
            department: '여성',
            storeCode: user.dept_name,
            address: user.dong_name + (user.dong_detail ? ' ' + user.dong_detail : ''),
            managerName: user.charge_name,
            managerPhone: user.tel_no,
            notes: `${user.user_id} 사용자로부터 누락 데이터 복구`,
            isActive: true
          });
          
          await newStore.save();
          console.log('✅ Store 생성 완료:', user.charge_name);
          
        } catch (error) {
          console.error('❌ Store 생성 실패:', user.charge_name, error.message);
        }
      } else {
        console.log('✅ Store 엔트리 존재:', user.charge_name);
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

fixMissingStore();