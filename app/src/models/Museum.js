const mongoose = require('mongoose');

const openingHourSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    openingHour: { type: String, default: '-' },
    closingHour: { type: String, default: '-' },
  },
  { _id: false }
);

const logisticsSchema = new mongoose.Schema(
  {
    exit: { type: String, required: true, trim: true },
    toilet: { type: String, trim: true },
    bar: { type: String, trim: true },
    shop: { type: String, trim: true },
    obstacles: { type: String, trim: true },
  },
  { _id: false }
);

const museumSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    shortName: { type: String },
    slug: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
    coverImage: { type: String },
    shortDescription: { type: String, required: true },
    longDescription: { type: String },
    city: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    openingHours: { type: [openingHourSchema], required: true, default: [] },
    ticketInfo: { type: String },
    accessibilityNotes: { type: String },
    services: { type: [String], required: true, default: [] },
    logistics: { type: logisticsSchema, required: true },
    internalNotes: { type: String },
    defaultLanguage: { type: String, required: true, trim: true, lowercase: true },
    supportedLanguages: {
      type: [{ type: String, trim: true, lowercase: true }],
      required: true,
      default: [],
    },
    assignedCuratorIds: { type: [String], required: true, default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Museum', museumSchema);
