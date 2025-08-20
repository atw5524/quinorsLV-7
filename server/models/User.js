const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, '사용자 ID는 필수입니다'],
    unique: true,
    trim: true,
    minlength: [6, '사용자 ID는 최소 6자 이상이어야 합니다'],
    maxlength: [20, '사용자 ID는 20자 이하여야 합니다'],
    match: [/^[A-Z0-9_]+$/, '사용자 ID는 대문자, 숫자, 언더스코어만 가능합니다']
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다'],
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다']
  },
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
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'manager'],
      message: '역할은 user, admin, manager 중 하나여야 합니다'
    },
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountRequest'
  },
  // 추가 정보
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  profile: {
    email: String,
    phone: String,
    department: String
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // 비밀번호와 민감한 정보는 JSON 응답에서 제외
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// 인덱스 설정
userSchema.index({ userId: 1 }, { unique: true });
userSchema.index({ storeCode: 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// 가상 필드
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('fullInfo').get(function() {
  return `${this.managerName} (${this.userId}) - ${this.storeCode}`;
});

// 비밀번호 암호화 (저장 전)
userSchema.pre('save', async function(next) {
  // 비밀번호가 수정된 경우에만 암호화
  if (!this.isModified('password')) return next();
  
  try {
    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 매장코드를 대문자로 변환
userSchema.pre('save', function(next) {
  if (this.storeCode) {
    this.storeCode = this.storeCode.toUpperCase();
  }
  next();
});

// 인스턴스 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

userSchema.methods.incLoginAttempts = function() {
  // 잠금이 만료되었으면 초기화
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 5회 시도 후 계정 잠금 (1시간)
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 1000 * 60 * 60 }; // 1시간
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetPassword = async function(newPassword) {
  this.password = newPassword;
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// 정적 메서드
userSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId: userId.toUpperCase() });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

userSchema.statics.findByStoreCode = function(storeCode) {
  return this.find({ storeCode: storeCode.toUpperCase() });
};

userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
        users: { $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || { total: 0, active: 0, inactive: 0, users: 0, admins: 0 };
};

module.exports = mongoose.model('User', userSchema);