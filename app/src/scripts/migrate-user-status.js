/**
 * Migrazione one-shot: porta gli account con lo stato legacy rimosso a active.
 *
 * Non viene eseguita automaticamente: serve solo per database creati prima
 * della rimozione dello stato e supporta --dry-run.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');

async function migrateUserStatus({ dryRun = false } = {}) {
  await connectDb();

  const users = mongoose.connection.collection('users');
  const filter = { status: 'invited' };
  const found = await users.countDocuments(filter);

  console.log(`Utenti con stato legacy: ${found}`);
  if (dryRun) {
    console.log('Dry run completato: nessun dato modificato.');
    return { found, modified: 0 };
  }

  const result = await users.updateMany(filter, { $set: { status: 'active' } });
  console.log(`Utenti aggiornati: ${result.modifiedCount}`);
  return { found, modified: result.modifiedCount };
}

module.exports = migrateUserStatus;

if (require.main === module) {
  migrateUserStatus({ dryRun: process.argv.includes('--dry-run') })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
