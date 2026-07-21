const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const { startInMemoryMongo, stopInMemoryMongo } = require('../../testUtils/mongoServer');
const { clearDatabase, disconnectDatabase } = require('../../testUtils/dbHelpers');
const { createApiKey, createUser } = require('../../testUtils/authHelpers');

function purgeCache(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
}

describe('auth middleware', () => {
  let app;

  beforeAll(async () => {
    await startInMemoryMongo();

    purgeCache('../../../app/src/config/env');
    purgeCache('../../../app/src/config/db');
    purgeCache('../../../app/src/middleware/auth');

    const { connectDb } = require('../../../app/src/config/db');
    await connectDb();

    const {
      requireApiKey,
      requireJwt,
      requireApiKeyAndJwt,
      requireRole,
    } = require('../../../app/src/middleware/auth');

    app = express();
    app.use(express.json());

    app.get('/api-key-only', requireApiKey, (req, res) => {
      res.status(200).json({ ok: true, apiKeyPrefix: req.apiKey.prefix });
    });

    app.get('/jwt-only', requireJwt, (req, res) => {
      res.status(200).json({ ok: true, userId: req.user.id });
    });

    app.get('/both', requireApiKeyAndJwt, (req, res) => {
      res.status(200).json({ ok: true, userRole: req.user.role, apiKeyName: req.apiKey.name });
    });

    app.get('/admin-only', requireApiKeyAndJwt, requireRole('super_admin'), (_req, res) => {
      res.status(200).json({ ok: true });
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  it('rejects when api key is missing', async () => {
    const res = await request(app).get('/api-key-only');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Missing API key');
  });

  it('accepts valid api key', async () => {
    const apiKey = await createApiKey({ name: 'Middleware Test Key' });

    const res = await request(app).get('/api-key-only').set('x-api-key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.apiKeyPrefix).toContain('ak_test_');
  });

  it('accepts valid jwt', async () => {
    const { user } = await createUser({
      id: 'usr-auth-jwt',
      username: 'jwtuser',
      email: 'jwtuser@example.com',
      password: 'JwtPass123!',
      role: 'super_admin',
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get('/jwt-only').set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('usr-auth-jwt');
  });

  it('requires both api key and jwt together', async () => {
    const apiKey = await createApiKey({ name: 'Combined Key' });
    const { user } = await createUser({
      id: 'usr-auth-both',
      username: 'bothuser',
      email: 'bothuser@example.com',
      password: 'BothPass123!',
      role: 'super_admin',
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/both')
      .set('x-api-key', apiKey)
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userRole).toBe('super_admin');
    expect(res.body.apiKeyName).toBe('Combined Key');
  });

  it('enforces role checks', async () => {
    const apiKey = await createApiKey({ name: 'Role Key' });
    const { user } = await createUser({
      id: 'usr-auth-role',
      username: 'author',
      email: 'author@example.com',
      password: 'RolePass123!',
      role: 'author',
    });

    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/admin-only')
      .set('x-api-key', apiKey)
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Forbidden');
  });
});
