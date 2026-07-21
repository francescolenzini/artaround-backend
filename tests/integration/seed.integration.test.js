const mongoose = require('mongoose');

const { connectDb } = require('../../app/src/config/db');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { startInMemoryMongo, stopInMemoryMongo } = require('../testUtils/mongoServer');

async function runSeed() {
  delete require.cache[require.resolve('../../app/src/scripts/seed')];
  const seed = require('../../app/src/scripts/seed');
  await seed();
}

describe('seed idempotence', () => {
  beforeAll(async () => {
    await startInMemoryMongo();
    delete require.cache[require.resolve('../../app/src/config/env')];
    delete require.cache[require.resolve('../../app/src/config/db')];
    await connectDb();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  it('keeps Uffizi stable across repeated runs', async () => {
    await runSeed();

    const Museum = mongoose.model('Museum');
    const firstRunMuseums = await Museum.find({ slug: 'galleria-degli-uffizi' }).lean();

    expect(firstRunMuseums).toHaveLength(1);

    const firstId = firstRunMuseums[0].id;

    await runSeed();

    const secondRunMuseums = await Museum.find({ slug: 'galleria-degli-uffizi' }).lean();
    expect(secondRunMuseums).toHaveLength(1);
    expect(secondRunMuseums[0].id).toBe(firstId);
  });

  it('builds steps as itemsByRegister maps consistent with the stored items', async () => {
    await runSeed();

    const ArtworkItem = mongoose.model('ArtworkItem');
    const Visit = mongoose.model('Visit');
    const items = await ArtworkItem.find({}).lean();
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const visits = await Visit.find({}).lean();
    expect(visits).toHaveLength(3);

    let fullScaleSteps = 0;
    for (const visit of visits) {
      for (const step of visit.steps) {
        expect(step.itemId).toBeUndefined();
        const entries = Object.entries(step.itemsByRegister || {});
        if (step.type === 'main_item' || step.type === 'optional_item') {
          expect(entries.length).toBeGreaterThan(0);
        } else {
          expect(entries).toHaveLength(0);
        }
        for (const [register, itemId] of entries) {
          const item = itemsById.get(itemId);
          expect(item).toBeDefined();
          // Ogni slot punta a un item del registro corrispondente
          expect(item.classification.languageRegister).toBe(register);
        }
        if (entries.length === 5) fullScaleSteps += 1;
      }
    }
    // Le opere "vetrina" con la scala completa compaiono nelle visite
    expect(fullScaleSteps).toBeGreaterThan(0);
  });

  it('keeps same-register candidate items distinct and stable across runs', async () => {
    await runSeed();

    const ArtworkItem = mongoose.model('ArtworkItem');
    const firstCount = await ArtworkItem.countDocuments();

    // Almeno una coppia (opera, registro) ha più candidati (flusso di scelta
    // con preview nel Visit Builder)
    const items = await ArtworkItem.find({}).lean();
    const countByPair = new Map();
    for (const item of items) {
      const key = `${item.artworkId}|${item.classification.languageRegister}`;
      countByPair.set(key, (countByPair.get(key) || 0) + 1);
    }
    expect([...countByPair.values()].some((n) => n > 1)).toBe(true);

    // L'upsert per titolo non deve né duplicare né collassare i candidati
    await runSeed();
    expect(await ArtworkItem.countDocuments()).toBe(firstCount);
  });
});