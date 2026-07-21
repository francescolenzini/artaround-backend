const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema(
  {
    method: { type: String, required: true, index: true },
    path: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true, index: true },
    userId: { type: String, index: true },
    username: { type: String },
    apiKeyPrefix: { type: String, index: true },
    tenantScope: [{ type: String }],
    requestCreatedAt: { type: Date, required: true, index: true },
    requestCompletedAt: { type: Date, required: true },
    totalTimeMs: { type: Number, required: true, index: true },
    requestPayload: { type: mongoose.Schema.Types.Mixed },
    responsePayload: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    correlationId: { type: String, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('RequestLog', requestLogSchema);
