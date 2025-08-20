const mongoose = require('mongoose');

const accountRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: '상태는 pending, approved, rejected 중 하나여야 합니다'
    },
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
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
  generatedPassword: {
    type: String
  },
  // 추가 정보
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 추가
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // 비밀번호는 JSON 응답에서 제외
      delete ret.generatedPassword;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 인덱스 설정 (쿼리 성능 최적화)
accountRequestSchema.index({ storeCode: 1, phoneLast4: 1 });
accountRequestSchema.index({ status: 1, requestDate: -1 });
accountRequestSchema.index({ createdAt: -1 });

// 가상 필드 (계산된 필드)
accountRequestSchema.virtual('isProcessed').get(function() {
  return this.status !== 'pending';
});

accountRequestSchema.virtual('processingTime').get(function() {
  if (!this.processedDate) return null;
  return this.processedDate - this.requestDate;
});

// 메서드 정의
accountRequestSchema.methods.approve = function(adminId, notes) {
  this.status = 'approved';
  this.processedDate = new Date();
  this.processedBy = adminId;
  this.notes = notes;
  return this.save();
};

accountRequestSchema.methods.reject = function(adminId, notes) {
  this.status = 'rejected';
  this.processedDate = new Date();
  this.processedBy = adminId;
  this.notes = notes;
  return this.save();
};

// 정적 메서드 정의
accountRequestSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ requestDate: -1 });
};

accountRequestSchema.statics.findByStoreCode = function(storeCode) {
  return this.find({ storeCode: storeCode.toUpperCase() });
};

accountRequestSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = { pending: 0, approved: 0, rejected: 0, total: 0 };
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// pre-save 미들웨어
accountRequestSchema.pre('save', function(next) {
  // 매장코드를 대문자로 변환
  if (this.storeCode) {
    this.storeCode = this.storeCode.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('AccountRequest', accountRequestSchema);