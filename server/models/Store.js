const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  storeCode: {
    type: String,
    required: [true, '매장코드는 필수입니다'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, '매장코드는 20자 이하여야 합니다']
  },
  storeName: {
    type: String,
    required: [true, '매장명은 필수입니다'],
    trim: true,
    maxlength: [100, '매장명은 100자 이하여야 합니다']
  },
  managerName: {
    type: String,
    required: [true, '담당자명은 필수입니다'],
    trim: true,
    maxlength: [50, '담당자명은 50자 이하여야 합니다']
  },
  fullPhone: {
    type: String,
    required: [true, '연락처는 필수입니다'],
    trim: true,
    match: [/^01[0-9]-\d{3,4}-\d{4}$/, '올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)']
  },
  phoneLast4: {
    type: String,
    required: false,
    length: 4,
    match: [/^\d{4}$/, '연락처 뒷 4자리는 숫자만 가능합니다']
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accountIssued: {
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
  createdBy: {
    type: String,
    required: true,
    default: 'admin'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '메모는 500자 이하여야 합니다']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 저장 전 phoneLast4 자동 추출
storeSchema.pre('save', function(next) {
  if (this.fullPhone && this.isModified('fullPhone')) {
    // 전화번호에서 숫자만 추출
    const phoneNumbers = this.fullPhone.replace(/[^0-9]/g, '');
    // 뒷 4자리 추출
    this.phoneLast4 = phoneNumbers.slice(-4);
    console.log('📱 전화번호 처리:', { fullPhone: this.fullPhone, phoneLast4: this.phoneLast4 });
  }
  next();
});

// 업데이트 시에도 phoneLast4 자동 추출
storeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.fullPhone) {
    const phoneNumbers = update.fullPhone.replace(/[^0-9]/g, '');
    update.phoneLast4 = phoneNumbers.slice(-4);
    console.log('📱 전화번호 업데이트:', { fullPhone: update.fullPhone, phoneLast4: update.phoneLast4 });
  }
  next();
});

// 인덱스 설정
storeSchema.index({ storeCode: 1 }, { unique: true });
storeSchema.index({ managerName: 1, phoneLast4: 1 });
storeSchema.index({ isActive: 1 });

// 정적 메서드
storeSchema.statics.findByStoreCode = function(storeCode) {
  return this.findOne({ storeCode: storeCode.toUpperCase(), isActive: true });
};

storeSchema.statics.validateStoreInfo = async function(storeCode, managerName, phoneLast4) {
  console.log('🔍 매장 정보 검증 시작:', { storeCode, managerName, phoneLast4 });
  
  const store = await this.findOne({
    storeCode: storeCode.toUpperCase(),
    managerName: managerName,
    phoneLast4: phoneLast4,
    isActive: true
  });
  
  console.log('🔍 검증 결과:', store ? `일치 (${store.storeName})` : '불일치');
  return store;
};

storeSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
        accountIssued: { $sum: { $cond: ['$accountIssued', 1, 0] } },
        accountNotIssued: { $sum: { $cond: [{ $and: ['$isActive', { $not: '$accountIssued' }] }, 1, 0] } }
      }
    }
  ]);
  return stats[0] || { total: 0, active: 0, inactive: 0, accountIssued: 0, accountNotIssued: 0 };
};

module.exports = mongoose.model('Store', storeSchema);