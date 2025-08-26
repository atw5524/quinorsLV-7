const mongoose = require('mongoose');

const registerSchema = new mongoose.Schema({
  // Register.jsx에서 보내는 필드들과 매핑
  managerName: {
    type: String,
    required: [true, '담당자명은 필수입니다'],
    trim: true,
    maxlength: [50, '담당자명은 50자 이하여야 합니다']
  },
  storeCode: {
    type: String,
    required: [true, '매장코드는 필수입니다'],
    trim: true,
    uppercase: true,
    maxlength: [20, '매장코드는 20자 이하여야 합니다']
  },
  phoneLast4: {
    type: String,
    required: [true, '연락처 뒷 4자리는 필수입니다'],
    length: 4,
    match: [/^\d{4}$/, '연락처 뒷 4자리는 숫자만 가능합니다']
  },
  department: {
    type: String,
    enum: ['여성', '남성', '슈즈'],
    required: [true, '부서는 필수입니다']
  },
  // Register.jsx에서 추가로 받는 정보들
  storeName: {
    type: String,
    required: [true, '매장명은 필수입니다'],
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  addressDetail: {
    type: String,
    trim: true
  },
  fullPhone: {
    type: String,
    required: [true, '전체 연락처는 필수입니다'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'manual_approved', 'rejected'],
      message: '상태는 pending, manual_approved, rejected 중 하나여야 합니다'
    },
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '메모는 500자 이하여야 합니다']
  },
  generatedUserId: {
    type: String,
    trim: true
  },
  tempPassword: {
    type: String
  },
  // 매장 검증 결과
  validationResult: {
    isValid: {
      type: Boolean,
      default: false
    },
    matchedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store'
    },
    validatedAt: {
      type: Date
    }
  },
  // 클라이언트 정보
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.tempPassword;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 인덱스 설정
registerSchema.index({ storeCode: 1, department: 1, phoneLast4: 1 });
registerSchema.index({ status: 1, requestDate: -1 });
registerSchema.index({ createdAt: -1 });

// 가상 필드
registerSchema.virtual('isProcessed').get(function() {
  return this.status !== 'pending';
});

registerSchema.virtual('fullAddress').get(function() {
  const parts = [this.address, this.addressDetail].filter(Boolean);
  return parts.join(' ');
});

// 인스턴스 메서드
registerSchema.methods.approve = function(adminId, notes) {
  this.status = 'manual_approved';
  this.processedAt = new Date();
  this.processedBy = adminId;
  this.notes = notes;
  return this.save();
};

registerSchema.methods.reject = function(adminId, notes) {
  this.status = 'rejected';
  this.processedAt = new Date();
  this.processedBy = adminId;
  this.notes = notes;
  return this.save();
};

// 정적 메서드
registerSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ requestDate: -1 });
};

registerSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = { 
    pending: 0, 
    approved: 0, 
    rejected: 0, 
    total: 0,
    manual_approved: 0
  };

  stats.forEach(stat => {
    if (stat._id === 'manual_approved') {
      result.approved += stat.count;
      result.manual_approved = stat.count;
    } else {
      result[stat._id] = stat.count;
    }
    result.total += stat.count;
  });

  return result;
};

// pre-save 미들웨어
registerSchema.pre('save', function(next) {
  // 매장코드를 대문자로 변환
  if (this.storeCode) {
    this.storeCode = this.storeCode.toUpperCase();
  }
  
  // phoneLast4 자동 추출 (fullPhone에서)
  if (this.fullPhone && !this.phoneLast4) {
    const phoneNumbers = this.fullPhone.replace(/[^0-9]/g, '');
    this.phoneLast4 = phoneNumbers.slice(-4);
  }
  
  next();
});

module.exports = mongoose.model('Register', registerSchema);