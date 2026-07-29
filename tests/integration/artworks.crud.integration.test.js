const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const Artwork = require('../../app/src/models/Artwork');

describe('artworks CRUD + tenant scoping', () => {
  let app;
  let apiKey;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'CRUD Key' });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  async function login(username, password) {
    const res = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username, password });
    return res.body.token;
  }

  function authed(token) {
    return (req) => req.set('x-api-key', apiKey).set('Authorization', `Bearer ${token}`);
  }

  it('lets a super_admin create, read, update and delete an artwork', async () => {
    await createUser({
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'super_admin',
    });
    const token = await login('admin', 'Password123!');
    const auth = authed(token);

    const created = await auth(request(app).post('/artworks')).send({
      museumId: 'mus-1',
      title: 'La Nascita di Venere',
      artist: 'Botticelli',
    });
    expect(created.status).toBe(201);
    const { id } = created.body;
    expect(id).toBeDefined();

    const list = await auth(request(app).get('/artworks'));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination).toBeDefined();

    const got = await auth(request(app).get(`/artworks/${id}`));
    expect(got.status).toBe(200);
    expect(got.body.title).toBe('La Nascita di Venere');

    const updated = await auth(request(app).put(`/artworks/${id}`)).send({ title: 'Primavera' });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Primavera');

    const deleted = await auth(request(app).delete(`/artworks/${id}`));
    expect(deleted.status).toBe(204);

    const afterDelete = await auth(request(app).get(`/artworks/${id}`));
    expect(afterDelete.status).toBe(404);
  });

  it('scopes an author to its assigned museums', async () => {
    await createUser({
      id: 'usr-author',
      username: 'author',
      email: 'author@example.com',
      password: 'Password123!',
      role: 'author',
      assignedMuseumIds: ['mus-a'],
    });
    // Opera di un altro museo, che l'autore non deve poter vedere.
    await Artwork.create({ id: 'art-foreign', museumId: 'mus-b', title: 'Opera altrui' });

    const token = await login('author', 'Password123!');
    const auth = authed(token);

    const allowed = await auth(request(app).post('/artworks')).send({
      museumId: 'mus-a',
      title: 'Opera del curatore',
    });
    expect(allowed.status).toBe(201);

    const forbidden = await auth(request(app).post('/artworks')).send({
      museumId: 'mus-b',
      title: 'Non consentita',
    });
    expect(forbidden.status).toBe(403);

    const list = await auth(request(app).get('/artworks'));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].museumId).toBe('mus-a');

    const foreign = await auth(request(app).get('/artworks/art-foreign'));
    expect(foreign.status).toBe(403);
  });

  it('restringe la lista al museo richiesto per un author assegnato a più musei', async () => {
    await createUser({
      id: 'usr-multi-author',
      username: 'multi-author',
      email: 'multi-author@example.com',
      password: 'Password123!',
      role: 'author',
      assignedMuseumIds: ['mus-a', 'mus-b'],
    });
    await Artwork.create([
      { id: 'art-a', museumId: 'mus-a', title: 'Opera A' },
      { id: 'art-b', museumId: 'mus-b', title: 'Opera B' },
    ]);

    const token = await login('multi-author', 'Password123!');
    const auth = authed(token);

    const list = await auth(request(app).get('/artworks').query({ museumId: 'mus-a' }));
    expect(list.status).toBe(200);
    expect(list.body.data.map((artwork) => artwork.id)).toEqual(['art-a']);

    const outsideScope = await auth(request(app).get('/artworks').query({ museumId: 'mus-c' }));
    expect(outsideScope.status).toBe(200);
    expect(outsideScope.body.data).toHaveLength(0);
  });

  it('lets a visitor read but not write content', async () => {
    await createUser({
      id: 'usr-visitor',
      username: 'visitor',
      email: 'visitor@example.com',
      password: 'Password123!',
      role: 'visitor',
      assignedMuseumIds: ['mus-a'],
    });
    await Artwork.create({ id: 'art-visible', museumId: 'mus-a', title: 'Opera visibile' });

    const token = await login('visitor', 'Password123!');
    const auth = authed(token);

    // Lettura consentita sui musei assegnati (fruizione col Navigator).
    const list = await auth(request(app).get('/artworks'));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const read = await auth(request(app).get('/artworks/art-visible'));
    expect(read.status).toBe(200);

    // Scrittura vietata: il visitor è di sola lettura.
    const create = await auth(request(app).post('/artworks')).send({
      museumId: 'mus-a',
      title: 'Tentativo',
    });
    expect(create.status).toBe(403);

    const update = await auth(request(app).put('/artworks/art-visible')).send({ title: 'Modifica' });
    expect(update.status).toBe(403);

    const remove = await auth(request(app).delete('/artworks/art-visible'));
    expect(remove.status).toBe(403);
  });

  it('rejects requests without a valid JWT', async () => {
    const res = await request(app).get('/artworks').set('x-api-key', apiKey);
    expect(res.status).toBe(401);
  });
});
