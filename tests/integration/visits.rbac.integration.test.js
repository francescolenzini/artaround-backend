const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const Visit = require('../../app/src/models/Visit');

// Regressione: una visita in bozza (status !== 'published') non deve essere
// visibile né eseguibile da un visitor nel Navigator, né in lista né per
// accesso diretto via id (URL del player). Gli editor (author/super_admin)
// devono invece continuare a vedere le bozze.
describe('visits publication gating per ruolo', () => {
  let app;
  let apiKey;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Visits RBAC Key' });

    await createUser({
      id: 'usr-visitor',
      username: 'visitor',
      email: 'visitor@example.com',
      password: 'Password123!',
      role: 'visitor',
      assignedMuseumIds: ['mus-a'],
    });
    await createUser({
      id: 'usr-author',
      username: 'author',
      email: 'author@example.com',
      password: 'Password123!',
      role: 'author',
      assignedMuseumIds: ['mus-a', 'mus-b'],
    });

    await Visit.create({
      id: 'vis-published',
      museumId: 'mus-a',
      title: 'Visita pubblicata',
      estimatedDurationMinutes: 60,
      authorId: 'usr-author',
      status: 'published',
      steps: [],
    });
    await Visit.create({
      id: 'vis-draft',
      museumId: 'mus-a',
      title: 'Visita in bozza',
      estimatedDurationMinutes: 60,
      authorId: 'usr-author',
      status: 'draft',
      steps: [],
    });
    await Visit.create({
      id: 'vis-other-museum',
      museumId: 'mus-b',
      title: 'Visita di un altro museo',
      estimatedDurationMinutes: 30,
      authorId: 'usr-author',
      status: 'draft',
      steps: [],
    });
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

  it('nasconde le bozze al visitor nella lista visite', async () => {
    const token = await login('visitor', 'Password123!');
    const auth = authed(token);

    const list = await auth(request(app).get('/visits'));
    expect(list.status).toBe(200);

    const ids = list.body.data.map((v) => v.id);
    expect(ids).toContain('vis-published');
    expect(ids).not.toContain('vis-draft');
  });

  it('consente al visitor di leggere una visita pubblicata per id', async () => {
    const token = await login('visitor', 'Password123!');
    const auth = authed(token);

    const res = await auth(request(app).get('/visits/vis-published'));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('vis-published');
  });

  it('risponde 404 al visitor sull\'accesso diretto a una bozza', async () => {
    const token = await login('visitor', 'Password123!');
    const auth = authed(token);

    const res = await auth(request(app).get('/visits/vis-draft'));
    expect(res.status).toBe(404);
  });

  it('mostra le bozze a un author nella lista e per id', async () => {
    const token = await login('author', 'Password123!');
    const auth = authed(token);

    const list = await auth(request(app).get('/visits'));
    expect(list.status).toBe(200);
    const ids = list.body.data.map((v) => v.id);
    expect(ids).toContain('vis-published');
    expect(ids).toContain('vis-draft');

    const draft = await auth(request(app).get('/visits/vis-draft'));
    expect(draft.status).toBe(200);
    expect(draft.body.id).toBe('vis-draft');
  });

  it('restringe la lista al museo richiesto per un author assegnato a più musei', async () => {
    const token = await login('author', 'Password123!');
    const auth = authed(token);

    const list = await auth(request(app).get('/visits').query({ museumId: 'mus-a' }));
    expect(list.status).toBe(200);
    expect(list.body.data.map((visit) => visit.id).sort()).toEqual(['vis-draft', 'vis-published']);

    const outsideScope = await auth(request(app).get('/visits').query({ museumId: 'mus-c' }));
    expect(outsideScope.status).toBe(200);
    expect(outsideScope.body.data).toHaveLength(0);
  });
});
