const mongoose = require('mongoose');

const visitStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['logistics_intro', 'main_item', 'optional_item', 'transition'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    directionsFromPrevious: { type: String },
    // Una tappa = un'opera: al massimo un ArtworkItem per registro linguistico.
    // Le chiavi sono fisse (scala dei registri), i valori sono id di ArtworkItem.
    itemsByRegister: {
      infantile: { type: String },
      elementare: { type: String },
      medio: { type: String },
      avanzato: { type: String },
      specialistico: { type: String },
    },
    mapCoords: {
      x: { type: Number },
      y: { type: Number },
      floor: { type: Number },
    },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    museumId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String },
    subtitle: { type: String },
    description: { type: String },
    targetAudience: { type: String },
    coverImage: { type: String },
    estimatedDurationMinutes: { type: Number, required: true },
    estimatedDuration: { type: String },
    authorId: { type: String, required: true, index: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    steps: { type: [visitStepSchema], required: true, default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Visit', visitSchema);
