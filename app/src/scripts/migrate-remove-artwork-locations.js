/**
 * Migrazione one-shot: rimuove la collocazione dal modello editoriale Artwork.
 *
 * Sala, piano e coordinate sono ora configurazione statica del Navigator in
 * museum.config.json. Usare prima --dry-run su database già esistenti.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');

async function removeArtworkLocations({ dryRun = false } = {}) {
  await connectDb();

  const artworks = mongoose.connection.collection('artworks');
  const filter = { location: { $exists: true } };
  const count = await artworks.countDocuments(filter);
  console.log(`Opere con collocazione legacy: ${count}`);

  if (dryRun) {
    console.log('Dry run completato: nessun dato modificato.');
    return;
  }

  if (count) await artworks.updateMany(filter, { $unset: { location: '' } });
  console.log('Migrazione completata. Le posizioni sono ora in museum.config.json.');
}

module.exports = removeArtworkLocations;

if (require.main === module) {
  removeArtworkLocations({ dryRun: process.argv.includes('--dry-run') })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
