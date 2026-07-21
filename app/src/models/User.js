const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    avatar: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'author', 'visitor'], required: true, index: true },
    status: { type: String, enum: ['active', 'invited', 'suspended', 'archived'], default: 'active', index: true },
    assignedMuseumIds: { type: [String], required: true, default: [] },
    lastLogin: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('User', userSchema);
