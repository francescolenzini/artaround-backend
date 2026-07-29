/**
 * Wrapper one-shot per gocker: il comando `start` accetta un solo percorso
 * script e non inoltra `--apply` a Node.
 *
 * Non eseguire direttamente dalla shell Lily: Mongo e' raggiungibile solo dal
 * container Node del cluster.
 */

const mongoose = require('mongoose');
const { cleanupTestData } = require('./cleanup-test-data');

cleanupTestData({ apply: true })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
