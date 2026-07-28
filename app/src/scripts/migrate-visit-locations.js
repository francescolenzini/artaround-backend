/**
 * Migrazione one-shot: VisitStep.mapCoords -> Artwork.location + artworkId.
 *
 * Le coordinate appartengono all'opera e non alla visita. Il driver nativo e'
 * intenzionale: i campi legacy non sono piu' nello schema Mongoose e devono
 * essere letti e rimossi esplicitamente. Usare prima --dry-run.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');

const isItemStep = (step) => ['main_item', 'optional_item'].includes(step.type);
const samePoint = (a, b) => a && b && a.floor === b.floor && a.x === b.x && a.y === b.y;

function legacyLocation(mapCoords) {
  if (!mapCoords || ![mapCoords.floor, mapCoords.x, mapCoords.y].every(Number.isFinite)) return null;
  return { label: `Piano ${mapCoords.floor}`, floor: mapCoords.floor, x: mapCoords.x, y: mapCoords.y };
}

async function migrateVisitLocations({ dryRun = false } = {}) {
  await connectDb();

  const db = mongoose.connection;
  const [visits, items, artworks] = await Promise.all([
    db.collection('visits').find({}).toArray(),
    db.collection('artworkitems').find({}, { projection: { id: 1, artworkId: 1 } }).toArray(),
    db.collection('artworks').find({}, { projection: { id: 1, location: 1 } }).toArray(),
  ]);
  const artworkByItem = new Map(items.map((item) => [item.id, item.artworkId]));
  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const locationsToSet = new Map();
  const visitUpdates = [];
  const problems = [];
  let stepsMigrated = 0;

  for (const visit of visits) {
    let changed = false;
    const steps = (visit.steps || []).map((step) => {
      if (!isItemStep(step)) return step;
      const artworkIds = [...new Set((step.itemIds || []).map((id) => artworkByItem.get(id)).filter(Boolean))];
      if (artworkIds.length !== 1) {
        problems.push(`${visit.id}: tappa "${step.title}" non risolve una sola opera`);
        return step;
      }

      const artworkId = artworkIds[0];
      const point = legacyLocation(step.mapCoords);
      const stored = artworkById.get(artworkId)?.location;
      const pending = locationsToSet.get(artworkId);
      if (point && stored && !samePoint(point, stored)) {
        problems.push(`${visit.id}: coordinate in conflitto per opera ${artworkId}`);
      }
      if (point && pending && !samePoint(point, pending)) {
        problems.push(`${visit.id}: coordinate legacy in conflitto per opera ${artworkId}`);
      }
      if (point && !stored) locationsToSet.set(artworkId, point);

      const { mapCoords, ...rest } = step;
      if (rest.artworkId !== artworkId || mapCoords) {
        changed = true;
        stepsMigrated += 1;
      }
      return { ...rest, artworkId };
    });
    if (changed) visitUpdates.push({ _id: visit._id, steps });
  }

  if (problems.length) {
    throw new Error(`Migrazione annullata:\n- ${problems.join('\n- ')}`);
  }

  console.log(`Visite da aggiornare: ${visitUpdates.length}`);
  console.log(`Tappe da migrare: ${stepsMigrated}`);
  console.log(`Opere con collocazione da impostare: ${locationsToSet.size}`);
  if (dryRun) {
    console.log('Dry run completato: nessun dato modificato.');
    return;
  }

  await Promise.all([
    ...visitUpdates.map(({ _id, steps }) => db.collection('visits').updateOne({ _id }, { $set: { steps } })),
    ...[...locationsToSet.entries()].map(([id, location]) => db.collection('artworks').updateOne({ id }, { $set: { location } })),
  ]);
  console.log('Migrazione completata. Le collocazioni create da coordinate legacy hanno etichetta "Piano N": completale nell’Editor.');
}

module.exports = migrateVisitLocations;

if (require.main === module) {
  migrateVisitLocations({ dryRun: process.argv.includes('--dry-run') })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
