// server/models/User.js (기존 모델에 필드 추가)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 6,
    maxlength: 20,
    match: /^[a-z0-9]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  cust_name: {
    type: String,
    required: true,
    trim: true
  },
  dong_name: {
    type: String,
    required: true,
    trim: true
  },
  dong_detail: {
    type: String,
    trim: true
  },
  dept_name: {
    type: String,
    required: true,
    trim: true,
    match: /^[A-Z0-9]+$/
  },
  charge_name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 10
  },
  tel_no: {
    type: String,
    required: true,
    match: /^010\d{8}$/
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  processedAt: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// 비밀번호 해싱 미들웨어
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// JSON 변환 시 비밀번호 제외
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);