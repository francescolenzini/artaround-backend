const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const Artwork = require('../../app/src/models/Artwork');
const ArtworkItem = require('../../app/src/models/ArtworkItem');

describe('posizioni opera nelle visite', () => {
  let app;
  let apiKey;
  let token;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Visit locations key' });
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
      title: 'Opera in sala',
      location: { label: 'Sala A9', floor: 1, x: 40, y: 20 },
    });
    await ArtworkItem.create({
      id: 'itm-1',
      artworkId: 'art-1',
      classification: { languageRegister: 'medio', fruitionLength: '2min' },
      content: { title: 'Item', screenText: 'Testo' },
      creatorId: 'usr-author',
      lastUpdaterId: 'usr-author',
    });
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
  const visitPayload = (step) => ({
    museumId: 'mus-1',
    title: 'Visita',
    estimatedDurationMinutes: 10,
    steps: [step],
  });

  it('deriva mapLocation dall’opera, senza persisterla nella tappa', async () => {
    const created = await auth(request(app).post('/visits')).send(
      visitPayload({ id: 'step-1', type: 'main_item', title: 'Tappa', artworkId: 'art-1', itemIds: ['itm-1'], order: 1 })
    );
    expect(created.status).toBe(201);

    const read = await auth(request(app).get(`/visits/${created.body.id}`));
    expect(read.status).toBe(200);
    expect(read.body.steps[0]).toEqual(
      expect.objectContaining({ artworkId: 'art-1', mapLocation: { label: 'Sala A9', floor: 1, x: 40, y: 20 } })
    );
    expect(read.body.steps[0].mapCoords).toBeUndefined();
  });

  it('rifiuta coordinate duplicate o item di un’altra opera nella tappa', async () => {
    const legacy = await auth(request(app).post('/visits')).send(
      visitPayload({
        id: 'step-1', type: 'main_item', title: 'Tappa', artworkId: 'art-1', itemIds: ['itm-1'], mapCoords: { floor: 1, x: 40, y: 20 }, order: 1,
      })
    );
    expect(legacy.status).toBe(400);

    await Artwork.create({ id: 'art-2', museumId: 'mus-1', title: 'Altra opera', location: { label: 'Sala A10', floor: 1, x: 50, y: 20 } });
    await ArtworkItem.create({
      id: 'itm-2', artworkId: 'art-2', classification: { languageRegister: 'medio', fruitionLength: '2min' }, content: { title: 'Altro' }, creatorId: 'usr-author', lastUpdaterId: 'usr-author',
    });
    const inconsistent = await auth(request(app).post('/visits')).send(
      visitPayload({ id: 'step-1', type: 'main_item', title: 'Tappa', artworkId: 'art-1', itemIds: ['itm-2'], order: 1 })
    );
    expect(inconsistent.status).toBe(400);
  });
});
