const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');

describe('museum logistics and languages', () => {
  let app;
  let apiKey;
  let token;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Museum model key' });
    await createUser({
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'super_admin',
    });
    const login = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'admin', password: 'Password123!' });
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
  const validMuseum = (overrides = {}) => ({
    name: 'Museo Test',
    slug: `museo-test-${Date.now()}-${Math.random()}`,
    shortDescription: 'Descrizione',
    city: 'Bologna',
    address: 'Via Test 1',
    postalCode: '40100',
    country: 'Italy',
    defaultLanguage: 'it',
    logistics: { exit: 'Uscita al piano terra' },
    ...overrides,
  });

  it('creates and updates logistics, preserving optional fields', async () => {
    const created = await auth(request(app).post('/museums')).send(
      validMuseum({
        logistics: {
          exit: '  Uscita principale  ',
          toilet: '  Toilette al piano terra  ',
          bar: 'Bar in terrazza',
          shop: 'Bookshop all’uscita',
          obstacles: 'Ascensore disponibile',
        },
      })
    );

    expect(created.status).toBe(201);
    expect(created.body.logistics).toEqual({
      exit: 'Uscita principale',
      toilet: 'Toilette al piano terra',
      bar: 'Bar in terrazza',
      shop: 'Bookshop all’uscita',
      obstacles: 'Ascensore disponibile',
    });

    const updated = await auth(request(app).put(`/museums/${created.body.id}`)).send({
      logistics: { exit: 'Nuova uscita', toilet: 'Nuove toilette' },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.logistics).toEqual({ exit: 'Nuova uscita', toilet: 'Nuove toilette' });
  });

  it.each([
    [{ logistics: undefined }, 'assente'],
    [{ logistics: {} }, 'vuoto'],
    [{ logistics: { exit: '   ' } }, 'solo spazi'],
  ])('rejects logistics.exit when it is $1', async (overrides) => {
    const res = await auth(request(app).post('/museums')).send(validMuseum(overrides));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/logistics\.exit/);
  });

  it('normalizes, trims and deduplicates languages', async () => {
    const res = await auth(request(app).post('/museums')).send(
      validMuseum({
        defaultLanguage: ' IT ',
        supportedLanguages: [' IT ', 'en', ' EN '],
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.defaultLanguage).toBe('it');
    expect(res.body.supportedLanguages).toEqual(['it', 'en']);
  });

  it('adds defaultLanguage when supportedLanguages is omitted on create and update', async () => {
    const created = await auth(request(app).post('/museums')).send(validMuseum());
    expect(created.status).toBe(201);
    expect(created.body.supportedLanguages).toEqual(['it']);

    const updated = await auth(request(app).put(`/museums/${created.body.id}`)).send({
      defaultLanguage: ' EN ',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.defaultLanguage).toBe('en');
    expect(updated.body.supportedLanguages).toEqual(['it', 'en']);
  });

  it('rejects a defaultLanguage missing from explicit supportedLanguages', async () => {
    const created = await auth(request(app).post('/museums')).send(
      validMuseum({ defaultLanguage: 'it', supportedLanguages: ['en'] })
    );
    expect(created.status).toBe(400);
    expect(created.body.error.message).toBe('defaultLanguage must be included in supportedLanguages');

    const valid = await auth(request(app).post('/museums')).send(validMuseum());
    const updated = await auth(request(app).put(`/museums/${valid.body.id}`)).send({
      defaultLanguage: 'en',
      supportedLanguages: ['it'],
    });
    expect(updated.status).toBe(400);
    expect(updated.body.error.message).toBe('defaultLanguage must be included in supportedLanguages');
  });
});
