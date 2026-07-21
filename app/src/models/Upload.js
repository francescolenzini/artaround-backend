const mongoose = require('mongoose');

// File binari caricati dal Marketplace (immagini di opere/item). Il binario
// vive in MongoDB (campo Buffer, max 5MB per file, ben sotto il limite BSON di
// 16MB): nel deploy del dipartimento è il container dati Mongo a essere
// persistito, quindi le immagini sopravvivono ai redeploy del container codice.
const uploadSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploaderId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Upload', uploadSchema);
