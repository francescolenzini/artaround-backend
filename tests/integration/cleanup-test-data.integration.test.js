const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const Museum = require('../../app/src/models/Museum');
const Visit = require('../../app/src/models/Visit');
const Artwork = require('../../app/src/models/Artwork');
const ArtworkItem = require('../../app/src/models/ArtworkItem');
const Upload = require('../../app/src/models/Upload');
const { cleanupTestData } = require('../../app/src/scripts/cleanup-test-data');

describe('cleanup dei dati residui di Test', () => {
  beforeAll(async () => {
    await buildTestApp();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  async function seedTargetGraph() {
    await Museum.create({
      id: 'mus-test',
      slug: 'museo-di-prova',
      name: 'Museo di Prova',
      shortDescription: 'Museo per test',
      city: 'Bologna',
      address: 'Via Test 1',
      postalCode: '40100',
      country: 'Italy',
      logistics: { exit: 'Uscita' },
      defaultLanguage: 'it',
      supportedLanguages: ['it'],
    });
    await Upload.create({
      id: 'upl-test',
      filename: 'test.png',
      mimeType: 'image/png',
      size: 1,
      data: Buffer.from([0]),
      uploaderId: 'usr-test',
    });
    await Artwork.create({
      id: 'art-test',
      museumId: 'mus-test',
      title: 'Opera Test',
      assets: [{ type: 'image', source: '/uploads/upl-test' }],
    });
    await ArtworkItem.create({
      id: 'itm-test',
      artworkId: 'art-test',
      classification: { languageRegister: 'medio', fruitionLength: '1min' },
      content: { title: 'Item Test' },
      images: [{ id: 'img-test', source: '/uploads/upl-test' }],
      creatorId: 'usr-test',
      lastUpdaterId: 'usr-test',
    });
    await Visit.create({
      id: 'vis-1785351093475-45',
      museumId: 'mus-test',
      title: 'Visita',
      subtitle: 'Test',
      estimatedDurationMinutes: 21,
      authorId: 'usr-test',
      status: 'draft',
      steps: [{
        id: 'step-test',
        type: 'main_item',
        title: 'Opera Test',
        artworkId: 'art-test',
        itemIds: ['itm-test'],
        defaultItemId: 'itm-test',
        order: 1,
      }],
    });
  }

  it('non modifica nulla in dry-run', async () => {
    await seedTargetGraph();

    const summary = await cleanupTestData({ apply: false, connect: false });

    expect(summary.orphanUploadIds).toEqual(['upl-test']);
    expect(await Visit.countDocuments()).toBe(1);
    expect(await ArtworkItem.countDocuments()).toBe(1);
    expect(await Artwork.countDocuments()).toBe(1);
    expect(await Upload.countDocuments()).toBe(1);
  });

  it('elimina il grafo esatto e il relativo upload orfano con --apply', async () => {
    await seedTargetGraph();

    await cleanupTestData({ apply: true, connect: false });

    expect(await Visit.countDocuments()).toBe(0);
    expect(await ArtworkItem.countDocuments()).toBe(0);
    expect(await Artwork.countDocuments()).toBe(0);
    expect(await Upload.countDocuments()).toBe(0);
    expect(await Museum.countDocuments()).toBe(1);
  });
});
