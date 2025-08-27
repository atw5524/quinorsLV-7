// server/models/Store.js
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
    unique: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z0-9]+$/
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
    match: /^010\d{8}$/
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

module.exports = mongoose.model('Store', storeSchema);