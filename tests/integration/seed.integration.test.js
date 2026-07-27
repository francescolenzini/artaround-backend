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

  it('builds steps as flat itemIds lists consistent with the stored items', async () => {
    await runSeed();

    const ArtworkItem = mongoose.model('ArtworkItem');
    const Visit = mongoose.model('Visit');
    const items = await ArtworkItem.find({}).lean();
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const visits = await Visit.find({}).lean();
    expect(visits).toHaveLength(3);

    for (const visit of visits) {
      for (const step of visit.steps) {
        // Campi del modello precedente: la lista piatta li ha sostituiti
        expect(step.itemId).toBeUndefined();
        expect(step.itemsByRegister).toBeUndefined();

        const itemIds = step.itemIds || [];
        if (step.type === 'main_item' || step.type === 'optional_item') {
          expect(itemIds.length).toBeGreaterThan(0);
        } else {
          expect(itemIds).toHaveLength(0);
        }

        const stepItems = itemIds.map((id) => {
          const item = itemsById.get(id);
          expect(item).toBeDefined();
          return item;
        });

        // Una tappa = un'opera: tutte le varianti descrivono lo stesso oggetto
        expect(new Set(stepItems.map((item) => item.artworkId)).size).toBeLessThanOrEqual(1);

        // Invariante della griglia: nessuna cella (registro, durata) ambigua,
        // altrimenti il player non saprebbe quale variante presentare
        const cells = stepItems.map(
          (item) => `${item.classification.languageRegister}|${item.classification.fruitionLength}`
        );
        expect(new Set(cells).size).toBe(cells.length);
      }
    }
  });

  it('ships steps that make both axes navigable', async () => {
    await runSeed();

    const ArtworkItem = mongoose.model('ArtworkItem');
    const Visit = mongoose.model('Visit');
    const items = await ArtworkItem.find({}).lean();
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const visits = await Visit.find({}).lean();

    // Senza almeno una tappa che ha due durate sullo stesso registro, il seed
    // non dimostra la differenza fra "dimmi di più" e "troppo semplice":
    // entrambi i comandi ricadrebbero sull'unico asse percorribile.
    let stepsWithTwoDurationsInARegister = 0;
    let stepsWithTwoRegistersAtSameDuration = 0;

    for (const visit of visits) {
      for (const step of visit.steps) {
        const stepItems = (step.itemIds || []).map((id) => itemsById.get(id));
        const byRegister = new Map();
        const byDuration = new Map();
        for (const item of stepItems) {
          const { languageRegister, fruitionLength } = item.classification;
          byRegister.set(languageRegister, (byRegister.get(languageRegister) || 0) + 1);
          byDuration.set(fruitionLength, (byDuration.get(fruitionLength) || 0) + 1);
        }
        if ([...byRegister.values()].some((n) => n > 1)) stepsWithTwoDurationsInARegister += 1;
        if ([...byDuration.values()].some((n) => n > 1)) stepsWithTwoRegistersAtSameDuration += 1;
      }
    }

    expect(stepsWithTwoDurationsInARegister).toBeGreaterThan(0);
    expect(stepsWithTwoRegistersAtSameDuration).toBeGreaterThan(0);
  });

  it('keeps same-register variants distinct and stable across runs', async () => {
    await runSeed();

    const ArtworkItem = mongoose.model('ArtworkItem');
    const firstCount = await ArtworkItem.countDocuments();

    // Più varianti per la stessa coppia (opera, registro): è l'asse durata,
    // che senza questo resterebbe un metadato mai usato per scegliere un testo
    const items = await ArtworkItem.find({}).lean();
    const countByPair = new Map();
    for (const item of items) {
      const key = `${item.artworkId}|${item.classification.languageRegister}`;
      countByPair.set(key, (countByPair.get(key) || 0) + 1);
    }
    expect([...countByPair.values()].some((n) => n > 1)).toBe(true);

    // L'upsert per titolo non deve né duplicare né collassare le varianti
    await runSeed();
    expect(await ArtworkItem.countDocuments()).toBe(firstCount);
  });
});