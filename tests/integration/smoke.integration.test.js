const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');

describe('integration smoke', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  it('returns health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('protects docs-json with basic auth', async () => {
    const unauthorized = await request(app).get('/docs-json');
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .get('/docs-json')
      .auth(process.env.SWAGGER_USER, process.env.SWAGGER_PASSWORD);

    expect(authorized.status).toBe(200);
    expect(authorized.body.openapi).toBe('3.0.3');
  });

  it('logs in with valid api key and credentials', async () => {
    const apiKey = await createApiKey({ name: 'Integration Key' });
    await createUser({
      id: 'usr-smoke-1',
      email: 'smoke1@example.com',
      username: 'smoke1',
      password: 'SmokePass123!',
      role: 'super_admin',
    });

    const res = await request(app)
      .post('/auth/login')
      .set('x-api-key', apiKey)
      .send({ username: 'smoke1', password: 'SmokePass123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('smoke1');
  });

  it('rejects login when api key is missing', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'x', password: 'y' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Missing API key');
  });
});
