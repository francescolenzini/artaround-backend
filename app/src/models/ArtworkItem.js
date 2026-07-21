const mongoose = require('mongoose');

const classificationSchema = new mongoose.Schema(
  {
    // Stringa '{n}min' a minuti interi (es. '4min'), generata dall'editor;
    // niente enum chiuso — eventuali valori legacy in secondi restano leggibili.
    fruitionLength: { type: String },
    targetDurationSeconds: { type: Number },
    languageCode: { type: String },
    languageRegister: { type: String, enum: ['infantile', 'elementare', 'medio', 'avanzato', 'specialistico'] },
  },
  { _id: false }
);

const renderingSchema = new mongoose.Schema(
  {
    supportsScreen: { type: Boolean, default: true },
    supportsTTS: { type: Boolean, default: true },
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    title: { type: String },
    rendering: renderingSchema,
    screenText: { type: String },
    ttsText: { type: String },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    id: { type: String },
    source: { type: String },
    caption: { type: String },
  },
  { _id: false }
);

const priceSchema = new mongoose.Schema(
  {
    value: { type: Number },
    currency: { type: String },
  },
  { _id: false }
);

const artworkItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    artworkId: { type: String, required: true, index: true },
    classification: { type: classificationSchema, required: true },
    content: { type: contentSchema, required: true },
    images: { type: [imageSchema], required: true, default: [] },
    license: { type: String },
    isFree: { type: Boolean, default: true },
    price: priceSchema,
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    creatorId: { type: String, required: true, index: true },
    lastUpdaterId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ArtworkItem', artworkItemSchema);
