const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, enum: ['museum', 'artwork', 'item', 'visit', 'user'], required: true },
    entityId: { type: String, required: true, index: true },
    entityName: { type: String, required: true },
    museumId: { type: String, index: true },
    timestamp: { type: Date, required: true },
    details: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Activity', activitySchema);
