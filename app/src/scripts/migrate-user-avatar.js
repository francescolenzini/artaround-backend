/**
 * Migrazione one-shot: rimuove il campo User.avatar, ormai non più supportato.
 *
 * Usa il driver Mongo nativo perché il campo è stato rimosso dallo schema
 * Mongoose e quindi non sarebbe più affidabile leggerlo tramite il modello.
 * È idempotente e supporta --dry-run.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');

async function migrateUserAvatar({ dryRun = false } = {}) {
  await connectDb();

  const users = mongoose.connection.collection('users');
  const filter = { avatar: { $exists: true } };
  const found = await users.countDocuments(filter);

  console.log(`Utenti con avatar legacy: ${found}`);
  if (dryRun) {
    console.log('Dry run completato: nessun dato modificato.');
    return { found, modified: 0 };
  }

  const result = await users.updateMany(filter, { $unset: { avatar: '' } });
  console.log(`Avatar rimossi: ${result.modifiedCount}`);
  return { found, modified: result.modifiedCount };
}

module.exports = migrateUserAvatar;

if (require.main === module) {
  migrateUserAvatar({ dryRun: process.argv.includes('--dry-run') })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
