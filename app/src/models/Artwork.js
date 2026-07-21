const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    type: { type: String },
    source: { type: String },
    description: { type: String },
  },
  { _id: false }
);

const dimensionsSchema = new mongoose.Schema(
  {
    width: { type: Number },
    height: { type: Number },
    depth: { type: Number },
    unit: { type: String },
  },
  { _id: false }
);

const artworkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    museumId: { type: String, required: true, index: true },
    universalObjectId: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    artist: { type: String },
    year: { type: String },
    category: { type: String },
    style: { type: String },
    materials: { type: [String], required: true, default: [] },
    dimensions: dimensionsSchema,
    description: { type: String },
    assets: { type: [assetSchema], required: true, default: [] },
    tags: { type: [String], required: true, default: [] },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Artwork', artworkSchema);
