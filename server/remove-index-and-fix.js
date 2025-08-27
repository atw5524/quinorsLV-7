const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');

async function removeIndexAndFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quinors-lv');
    
    console.log('🗑️ 기존 인덱스 제거 시작...');
    
    // 1. 기존 storeCode_1 인덱스 제거
    try {
      await mongoose.connection.db.collection('stores').dropIndex('storeCode_1');
      console.log('✅ storeCode_1 인덱스 제거 완료');
    } catch (error) {
      console.log('ℹ️ storeCode_1 인덱스가 이미 없거나 제거할 수 없음:', error.message);
    }
    
    // 2. 모든 unique 관련 인덱스 확인 및 제거
    try {
      const indexes = await mongoose.connection.db.collection('stores').indexes();
      console.log('📋 현재 인덱스들:', indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));
      
      // storeCode와 관련된 unique 인덱스들 모두 제거
      for (const index of indexes) {
        if (index.unique && index.key.storeCode) {
          console.log('🗑️ unique 인덱스 제거:', index.name);
          try {
            await mongoose.connection.db.collection('stores').dropIndex(index.name);
          } catch (dropError) {
            console.log('⚠️ 인덱스 제거 실패:', index.name, dropError.message);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 인덱스 조회 실패:', error.message);
    }
    
    console.log('🔧 누락된 Store 데이터 생성 시작...');
    
    // 3. 승인된 사용자 중 Store에 없는 사용자 찾기
    const approvedUsers = await User.find({ status: 'approved' });
    console.log('✅ 승인된 사용자:', approvedUsers.length, '명');
    
    for (const user of approvedUsers) {
      // 해당 사용자의 Store 엔트리가 있는지 확인 (복합 조건으로)
      const existingStore = await Store.findOne({
        storeCode: user.dept_name,
        managerName: user.charge_name,
        managerPhone: user.tel_no
      });
      
      if (!existingStore) {
        console.log('❌ Store 엔트리 누락:', user.charge_name, user.dept_name);
        
        try {
          const storeData = {
            storeName: user.cust_name,
            department: '여성',
            storeCode: user.dept_name,
            address: user.dong_name + (user.dong_detail ? ' ' + user.dong_detail : ''),
            managerName: user.charge_name,
            managerPhone: user.tel_no,
            notes: `${user.user_id} 사용자로부터 누락 데이터 복구`,
            isActive: true
          };
          
          console.log('📝 생성할 Store 데이터:', storeData);
          
          const newStore = new Store(storeData);
          await newStore.save();
          
          console.log('✅ Store 생성 완료:', user.charge_name);
          
        } catch (error) {
          console.error('❌ Store 생성 실패:', user.charge_name);
          console.error('   오류 상세:', {
            message: error.message,
            code: error.code,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue
          });
        }
      } else {
        console.log('✅ Store 엔트리 존재:', user.charge_name);
      }
    }
    
    // 4. 최종 확인
    const finalStores = await Store.find();
    console.log('🎉 최종 Store 데이터:', finalStores.length, '개');
    finalStores.forEach(store => {
      console.log(`  - ${store.storeName}: ${store.managerName} (${store.storeCode})`);
    });
    
    // 5. 새로운 복합 인덱스 생성 (같은 매장의 같은 담당자만 중복 방지)
    try {
      await mongoose.connection.db.collection('stores').createIndex(
        { storeCode: 1, managerName: 1, managerPhone: 1 }, 
        { unique: true, name: 'compound_unique_manager' }
      );
      console.log('✅ 새로운 복합 인덱스 생성 완료');
    } catch (indexError) {
      console.log('⚠️ 복합 인덱스 생성 실패:', indexError.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 전체 작업 실패:', error);
    process.exit(1);
  }
}

removeIndexAndFix();