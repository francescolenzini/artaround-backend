const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const Artwork = require('../../app/src/models/Artwork');
const ArtworkItem = require('../../app/src/models/ArtworkItem');

describe('varianti registro e durata nelle tappe', () => {
  let app;
  let apiKey;
  let token;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Visit variants key' });
    const { password } = await createUser({
      id: 'usr-author',
      username: 'author',
      email: 'author@example.com',
      password: 'Password123!',
      role: 'author',
      assignedMuseumIds: ['mus-1'],
    });
    await Artwork.create({
      id: 'art-1',
      museumId: 'mus-1',
      title: 'Opera',
    });
    await ArtworkItem.create([
      item('itm-medio-2-a', 'medio', '2min'),
      item('itm-medio-2-b', 'medio', '2min'),
      item('itm-medio-4', 'medio', '4min'),
      item('itm-avanzato-2', 'avanzato', '2min'),
    ]);

    const login = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'author', password });
    token = login.body.token;
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  const auth = (req) => req.set('x-api-key', apiKey).set('Authorization', `Bearer ${token}`);
  const step = (itemIds) => ({
    id: 'step-1',
    type: 'main_item',
    title: 'Tappa',
    artworkId: 'art-1',
    itemIds,
    defaultItemId: itemIds[0],
    order: 1,
  });
  const payload = (itemIds) => ({
    museumId: 'mus-1',
    title: 'Visita',
    estimatedDurationMinutes: 10,
    steps: [step(itemIds)],
  });

  it('rifiuta due item distinti con la stessa coppia registro e durata in POST e PUT', async () => {
    const duplicatePost = await auth(request(app).post('/visits')).send(
      payload(['itm-medio-2-a', 'itm-medio-2-b'])
    );
    expect(duplicatePost.status).toBe(400);
    expect(duplicatePost.body.error.message).toMatch(/same language register and duration/i);

    const created = await auth(request(app).post('/visits')).send(
      payload(['itm-medio-2-a', 'itm-medio-4'])
    );
    expect(created.status).toBe(201);

    const duplicatePut = await auth(request(app).put(`/visits/${created.body.id}`)).send({
      steps: [step(['itm-medio-2-a', 'itm-medio-2-b'])],
    });
    expect(duplicatePut.status).toBe(400);
    expect(duplicatePut.body.error.message).toMatch(/same language register and duration/i);
  });

  it('accetta durate diverse nello stesso registro e registri diversi con la stessa durata', async () => {
    const response = await auth(request(app).post('/visits')).send(
      payload(['itm-medio-2-a', 'itm-medio-4', 'itm-avanzato-2'])
    );
    expect(response.status).toBe(201);
  });

  it('richiede un item iniziale appartenente alla tappa', async () => {
    const missing = payload(['itm-medio-2-a', 'itm-medio-4']);
    delete missing.steps[0].defaultItemId;
    const missingResponse = await auth(request(app).post('/visits')).send(missing);
    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body.error.message).toMatch(/defaultItemId included in itemIds/i);

    const outside = payload(['itm-medio-2-a', 'itm-medio-4']);
    outside.steps[0].defaultItemId = 'itm-avanzato-2';
    const outsideResponse = await auth(request(app).post('/visits')).send(outside);
    expect(outsideResponse.status).toBe(400);
    expect(outsideResponse.body.error.message).toMatch(/defaultItemId included in itemIds/i);
  });

  it('mantiene coerente il registro legacy con l’item iniziale', async () => {
    const body = payload(['itm-medio-2-a', 'itm-avanzato-2']);
    body.steps[0].defaultItemId = 'itm-avanzato-2';
    body.steps[0].defaultRegister = 'medio';
    const response = await auth(request(app).post('/visits')).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/defaultRegister must match/i);
  });
});

function item(id, languageRegister, fruitionLength) {
  return {
    id,
    artworkId: 'art-1',
    classification: { languageRegister, fruitionLength },
    content: { title: id, screenText: 'Testo' },
    creatorId: 'usr-author',
    lastUpdaterId: 'usr-author',
  };
}
