const request = require('supertest');
const mongoose = require('mongoose');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const migrateUserAvatar = require('../../app/src/scripts/migrate-user-avatar');

describe('rimozione avatar utenti', () => {
  let app;
  let apiKey;
  let token;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Avatar removal key' });
    await createUser({
      id: 'usr-avatar-admin',
      email: 'avatar-admin@example.com',
      username: 'avatar-admin',
      password: 'Password123!',
      role: 'super_admin',
    });

    const login = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'avatar-admin', password: 'Password123!' });
    token = login.body.token;
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  it('non persiste né restituisce avatar nei CRUD utenti', async () => {
    const created = await request(app)
      .post('/users')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Utente Senza Avatar',
        email: 'senza-avatar@example.com',
        username: 'senza-avatar',
        password: 'Password123!',
        role: 'author',
        assignedMuseumIds: [],
        avatar: 'data:image/png;base64,legacy',
      });

    expect(created.status).toBe(201);
    expect(created.body.avatar).toBeUndefined();

    const listed = await request(app)
      .get('/users')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`);

    expect(listed.status).toBe(200);
    expect(listed.body.data.find((user) => user.username === 'senza-avatar').avatar).toBeUndefined();
  });

  it('rimuove i campi avatar legacy in modo idempotente', async () => {
    await createUser({
      id: 'usr-legacy-avatar',
      email: 'legacy-avatar@example.com',
      username: 'legacy-avatar',
    });

    const users = mongoose.connection.collection('users');
    await users.updateOne({ id: 'usr-legacy-avatar' }, { $set: { avatar: 'legacy-url' } });

    const firstRun = await migrateUserAvatar();
    expect(firstRun.modified).toBe(1);
    expect((await users.findOne({ id: 'usr-legacy-avatar' })).avatar).toBeUndefined();

    const secondRun = await migrateUserAvatar();
    expect(secondRun.modified).toBe(0);
  });
});
