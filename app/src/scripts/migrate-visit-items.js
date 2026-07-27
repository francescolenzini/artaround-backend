/**
 * Migrazione one-shot: VisitStep.itemsByRegister -> VisitStep.itemIds.
 *
 * Il modello è passato da una mappa a chiavi fisse `{ registro -> un item }` a
 * una lista piatta di varianti, perché una tappa deve poter contenere più item
 * dello stesso registro con durate diverse (i due assi che il Navigator naviga
 * con "troppo semplice" e "dimmi di più"). Registro e durata di ogni variante
 * si leggono da ArtworkItem.classification, non più dalla chiave dello step.
 *
 * Un re-seed ricrea solo le visite del seed: questo script serve alle visite
 * scritte a mano dall'Editor, che nel database di sviluppo sopravvivono al
 * seed. È idempotente — rieseguirlo non fa nulla — e legge/scrive tramite il
 * driver nativo, perché `itemsByRegister` non esiste più nello schema Mongoose
 * e verrebbe scartato in lettura.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');

async function migrateVisitItems() {
  await connectDb();

  const visits = mongoose.connection.collection('visits');
  const cursor = visits.find({ 'steps.itemsByRegister': { $exists: true } });

  let visitsTouched = 0;
  let stepsMigrated = 0;
  let stepsAlreadyDone = 0;

  for await (const visit of cursor) {
    let changed = false;

    const steps = (visit.steps || []).map((step) => {
      if (!step.itemsByRegister) return step;
      const { itemsByRegister, ...rest } = step;

      // `itemIds` già presente: la tappa è stata migrata (o riscritta
      // dall'Editor nuovo) e il vecchio campo è solo un residuo da rimuovere.
      if (Array.isArray(rest.itemIds) && rest.itemIds.length) {
        stepsAlreadyDone += 1;
        changed = true;
        return rest;
      }

      // Ordine dei registri dal più semplice al più specialistico: senza, la
      // lista rifletterebbe l'ordine di inserimento delle chiavi in Mongo.
      const itemIds = REGISTER_ORDER.map((register) => itemsByRegister[register]).filter(Boolean);

      stepsMigrated += 1;
      changed = true;
      return itemIds.length ? { ...rest, itemIds } : rest;
    });

    if (!changed) continue;

    await visits.updateOne({ _id: visit._id }, { $set: { steps } });
    visitsTouched += 1;
  }

  console.log('');
  console.log('Migrazione itemsByRegister -> itemIds completata.');
  console.log('  Visite aggiornate:      ' + visitsTouched);
  console.log('  Tappe migrate:          ' + stepsMigrated);
  console.log('  Tappe già a posto:      ' + stepsAlreadyDone + ' (rimosso solo il campo residuo)');
  console.log('');
}

// Stessa scala di ArtworkItem.classification.languageRegister.
const REGISTER_ORDER = ['infantile', 'elementare', 'medio', 'avanzato', 'specialistico'];

module.exports = migrateVisitItems;

if (require.main === module) {
  migrateVisitItems()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
}
