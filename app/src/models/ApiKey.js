const crypto = require('crypto');
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    prefix: { type: String, required: true, unique: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    createdByUserId: { type: String },
    disabledByUserId: { type: String },
    disabledAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

apiKeySchema.statics.hashValue = function hashValue(apiKeyValue) {
  return crypto.createHash('sha256').update(apiKeyValue).digest('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
