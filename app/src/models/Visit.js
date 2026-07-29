const mongoose = require('mongoose');

const visitStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['logistics_intro', 'main_item', 'optional_item', 'transition'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    // Una tappa = un'opera, con tutte le sue varianti disponibili in visita.
    // Registro e durata di ciascuna variante si leggono da
    // ArtworkItem.classification: qui non si duplicano, così non possono
    // divergere. Più varianti sullo stesso registro sono legittime, purché
    // differiscano per durata — sono i due assi che il player naviga con
    // "troppo semplice" (registro) e "dimmi di più" (durata).
    artworkId: { type: String, index: true },
    itemIds: { type: [String], default: undefined },
    // Variante editoriale da proporre al primo ingresso nella tappa. Il campo
    // resta opzionale nello schema per poter leggere i documenti storici; le
    // nuove scritture vengono validate dalle route.
    defaultItemId: { type: String },
    // Compatibilità con le visite create prima di defaultItemId.
    defaultRegister: { type: String, enum: ['infantile', 'elementare', 'medio', 'avanzato', 'specialistico'] },
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
