const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['여성', '남성', '슈즈'],
    default: '여성'
  },
  storeCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z0-9]+$/  // ✅ 수정: 대괄호 이스케이프 제거
    // unique: true 제거됨 - 같은 매장코드 허용
  },
  address: {
    type: String,
    trim: true
  },
  managerName: {
    type: String,
    required: true,
    trim: true
  },
  managerPhone: {
    type: String,
    required: true,
    match: /^010\d{8}$/  // ✅ 수정: 백슬래시 이중 이스케이프 제거
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 업데이트 시 updatedAt 자동 갱신
storeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ✅ 복합 인덱스로 같은 매장의 같은 담당자만 중복 방지
storeSchema.index({ storeCode: 1, managerName: 1, managerPhone: 1 }, { unique: true });

module.exports = mongoose.model('Store', storeSchema);