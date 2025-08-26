const mongoose = require('mongoose');

// 부서별 담당자 스키마 (StoreManage.jsx 요구사항)
const departmentSchema = new mongoose.Schema({
  department: {
    type: String,
    required: [true, '부서는 필수입니다'],
    enum: ['여성', '남성', '슈즈']
  },
  managerName: {
    type: String,
    required: [true, '담당자명은 필수입니다'],
    trim: true,
    maxlength: [50, '담당자명은 50자 이하여야 합니다']
  },
  managerPhone: {
    type: String,
    required: [true, '담당자 연락처는 필수입니다'],
    trim: true,
    match: [/^01[0-9]-\d{3,4}-\d{4}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)']
  },
  phoneLast4: {
    type: String,
    required: true,
    length: 4,
    match: [/^\d{4}$/, '연락처 뒷 4자리는 숫자만 가능합니다']
  },
  hasUserAccount: {
    type: Boolean,
    default: false
  },
  accountIssuedDate: {
    type: Date
  },
  generatedUserId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '메모는 500자 이하여야 합니다']
  }
}, {
  timestamps: true
});

const storeSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: [true, '매장명은 필수입니다'],
    trim: true,
    maxlength: [100, '매장명은 100자 이하여야 합니다']
  },
  storeCode: {
    type: String,
    required: [true, '매장코드는 필수입니다'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, '매장코드는 20자 이하여야 합니다']
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true,
    default: 'admin'
  },
  // StoreManage.jsx에서 사용하는 부서별 정보
  departments: [departmentSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 저장 전 phoneLast4 자동 추출
storeSchema.pre('save', function(next) {
  if (this.departments && this.departments.length > 0) {
    this.departments.forEach(dept => {
      if (dept.managerPhone && (!dept.phoneLast4 || dept.isModified('managerPhone'))) {
        const phoneNumbers = dept.managerPhone.replace(/[^0-9]/g, '');
        dept.phoneLast4 = phoneNumbers.slice(-4);
        console.log('📱 부서별 전화번호 처리:', {
          department: dept.department,
          managerPhone: dept.managerPhone,
          phoneLast4: dept.phoneLast4
        });
      }
    });
  }
  next();
});

// 업데이트 시에도 phoneLast4 자동 추출
storeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.departments && Array.isArray(update.departments)) {
    update.departments.forEach(dept => {
      if (dept.managerPhone && !dept.phoneLast4) {
        const phoneNumbers = dept.managerPhone.replace(/[^0-9]/g, '');
        dept.phoneLast4 = phoneNumbers.slice(-4);
      }
    });
  }
  next();
});

// 인덱스 설정
storeSchema.index({ storeCode: 1 }, { unique: true });
storeSchema.index({ storeName: 1 });
storeSchema.index({ 'departments.department': 1 });
storeSchema.index({ 'departments.managerName': 1, 'departments.phoneLast4': 1 });
storeSchema.index({ isActive: 1 });

// 정적 메서드
storeSchema.statics.findByStoreCode = function(storeCode) {
  return this.findOne({ storeCode: storeCode.toUpperCase(), isActive: true });
};

// Register.jsx에서 사용하는 매장 정보 검증
storeSchema.statics.validateStoreInfo = async function(storeCode, managerName, phoneLast4, department) {
  console.log('🔍 매장 정보 검증 시작:', { storeCode, managerName, phoneLast4, department });

  const store = await this.findOne({
    storeCode: storeCode.toUpperCase(),
    isActive: true,
    'departments': {
      $elemMatch: {
        department: department,
        managerName: managerName,
        phoneLast4: phoneLast4
      }
    }
  });

  if (store) {
    // 일치하는 부서 정보 찾기
    const matchedDepartment = store.departments.find(dept =>
      dept.department === department &&
      dept.managerName === managerName &&
      dept.phoneLast4 === phoneLast4
    );
    store.matchedDepartment = matchedDepartment;
  }

  console.log('🔍 검증 결과:', store ? `일치 (${store.storeName} ${department})` : '불일치');
  return store;
};

// StoreManage.jsx에서 사용하는 통계
storeSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    { $unwind: { path: '$departments', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        totalStores: { $addToSet: '$storeName' },
        totalDepartments: { $sum: { $cond: [{ $ne: ['$departments', null] }, 1, 0] } },
        totalManagers: { $sum: { $cond: [{ $ne: ['$departments.managerName', null] }, 1, 0] } },
        activeStores: { $addToSet: { $cond: ['$isActive', '$storeName', null] } }
      }
    },
    {
      $project: {
        totalStores: { $size: '$totalStores' },
        totalDepartments: 1,
        totalManagers: 1,
        activeStores: { $size: { $filter: { input: '$activeStores', cond: { $ne: ['$$this', null] } } } }
      }
    }
  ]);

  return stats[0] || { totalStores: 0, totalDepartments: 0, totalManagers: 0, activeStores: 0 };
};

module.exports = mongoose.model('Store', storeSchema);