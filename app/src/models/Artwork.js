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

// La collocazione e' dell'opera, non della singola visita: tutte le visite
// che la includono devono quindi puntare allo stesso luogo sulla planimetria.
const locationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    // Valore opaco concordato con museum.config.json (oggi 1 e 2 per gli Uffizi).
    floor: { type: Number, min: 0 },
    x: { type: Number, min: 0, max: 100 },
    y: { type: Number, min: 0, max: 100 },
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
    location: {
      type: locationSchema,
      validate: {
        validator(value) {
          if (!value) return true;
          return (
            typeof value.label === 'string' &&
            value.label.trim().length > 0 &&
            Number.isFinite(value.floor) &&
            Number.isFinite(value.x) &&
            Number.isFinite(value.y)
          );
        },
        message: 'location must contain label, floor, x and y',
      },
    },
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
