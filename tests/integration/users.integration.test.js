const request = require('supertest');
const mongoose = require('mongoose');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const migrateUserStatus = require('../../app/src/scripts/migrate-user-status');
const User = require('../../app/src/models/User');

describe('utenti', () => {
  let app;
  let apiKey;
  let token;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Users test key' });
    await createUser({
      id: 'usr-admin',
      email: 'admin@example.com',
      username: 'admin',
      password: 'Password123!',
      role: 'super_admin',
    });
    await createUser({
      id: 'usr-author',
      email: 'author@example.com',
      username: 'author',
      password: 'Password123!',
      role: 'author',
      notes: 'Nota da conservare',
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

  function authenticatedRequest(method, path) {
    return request(app)[method](path).set('x-api-key', apiKey).set('Authorization', `Bearer ${token}`);
  }

  it('permette al super_admin di modificare e normalizzare lo username', async () => {
    const response = await authenticatedRequest('patch', '/users/usr-author').send({
      username: '  author-renamed  ',
      fullName: 'Nome aggiornato',
    });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('author-renamed');
    expect(response.body.fullName).toBe('Nome aggiornato');

    const stored = await mongoose.connection.collection('users').findOne({ id: 'usr-author' });
    expect(stored.username).toBe('author-renamed');
    expect(stored.fullName).toBe('Nome aggiornato');
    expect(stored.notes).toBe('Nota da conservare');
  });

  it('rifiuta username duplicato con conflitto e non modifica il record', async () => {
    const response = await authenticatedRequest('patch', '/users/usr-author').send({ username: 'admin' });

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({ message: 'username already exists', status: 409 });

    const stored = await mongoose.connection.collection('users').findOne({ id: 'usr-author' });
    expect(stored.username).toBe('author');
    expect(stored.notes).toBe('Nota da conservare');
  });

  it('rifiuta username vuoto o composto solo da spazi', async () => {
    const response = await authenticatedRequest('patch', '/users/usr-author').send({ username: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({ message: 'username cannot be empty', status: 400 });
    expect((await mongoose.connection.collection('users').findOne({ id: 'usr-author' })).username).toBe('author');
  });

  it('mantiene compatibili gli aggiornamenti di password e notes', async () => {
    const response = await authenticatedRequest('patch', '/users/usr-author').send({
      password: 'NuovaPassword123!',
      notes: 'Nota aggiornata',
    });

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Nota aggiornata');
    expect((await mongoose.connection.collection('users').findOne({ id: 'usr-author' })).notes).toBe('Nota aggiornata');

    const login = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'author', password: 'NuovaPassword123!' });
    expect(login.status).toBe(200);
  });

  it('permette al profilo stesso di cambiare username, ma non privilegi o assegnazioni', async () => {
    const login = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'author', password: 'Password123!' });

    const ownUpdate = await request(app)
      .patch('/users/usr-author')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ username: 'author-self' });
    expect(ownUpdate.status).toBe(200);
    expect(ownUpdate.body.username).toBe('author-self');

    const privilegeAttempt = await request(app)
      .patch('/users/usr-author')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ role: 'super_admin', assignedMuseumIds: ['mus-1'] });
    expect(privilegeAttempt.status).toBe(400);
    expect(privilegeAttempt.body.error.message).toMatch(/unsupported patch fields/);
  });

  it('non accetta lo stato rimosso nello schema né nella route di creazione', async () => {
    const validation = new User({ status: 'invited' }).validateSync();
    expect(validation.errors.status).toBeDefined();

    const response = await authenticatedRequest('post', '/users').send({
      fullName: 'Utente Legacy',
      email: 'legacy@example.com',
      username: 'legacy-user',
      password: 'Password123!',
      role: 'author',
      status: 'invited',
      assignedMuseumIds: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({ message: 'status must be active, suspended, or archived', status: 400 });
    expect(await mongoose.connection.collection('users').countDocuments({ username: 'legacy-user' })).toBe(0);
  });

  it('migra in modo esplicito e idempotente gli stati legacy', async () => {
    const users = mongoose.connection.collection('users');
    await users.updateOne({ id: 'usr-author' }, { $set: { status: 'invited' } });

    const firstRun = await migrateUserStatus();
    expect(firstRun).toEqual({ found: 1, modified: 1 });
    expect((await users.findOne({ id: 'usr-author' })).status).toBe('active');

    const secondRun = await migrateUserStatus();
    expect(secondRun).toEqual({ found: 0, modified: 0 });
  });
});
