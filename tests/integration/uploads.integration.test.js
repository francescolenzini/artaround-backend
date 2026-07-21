const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');

// PNG 1x1 valido: basta un binario reale con il mimetype giusto.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('uploads (image upload + public serve)', () => {
  let app;
  let apiKey;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Uploads Key' });
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

  async function createEditorAndLogin() {
    await createUser({
      id: 'usr-admin',
      username: 'admin',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'super_admin',
    });
    return login('admin', 'Password123!');
  }

  it('uploads an image and serves it back publicly', async () => {
    const token = await createEditorAndLogin();

    const created = await request(app)
      .post('/uploads')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1PX, { filename: 'pixel.png', contentType: 'image/png' });

    expect(created.status).toBe(201);
    expect(created.body.id).toMatch(/^upl-/);
    expect(created.body.url).toBe(`/uploads/${created.body.id}`);
    expect(created.body.mimeType).toBe('image/png');
    expect(created.body.size).toBe(PNG_1PX.length);
    expect(created.body.data).toBeUndefined();

    // La GET e' pubblica: nessun header di auth (i tag <img> non li inviano).
    const served = await request(app).get(created.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(served.body, PNG_1PX)).toBe(0);
  });

  it('rejects non-image files', async () => {
    const token = await createEditorAndLogin();

    const res = await request(app)
      .post('/uploads')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not an image'), { filename: 'doc.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/image/i);
  });

  it('rejects files over the size limit with 413', async () => {
    const token = await createEditorAndLogin();
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    const res = await request(app)
      .post('/uploads')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', oversized, { filename: 'big.png', contentType: 'image/png' });

    expect(res.status).toBe(413);
  });

  it('rejects upload without JWT and write attempts by visitors', async () => {
    const noJwt = await request(app)
      .post('/uploads')
      .set('x-api-key', apiKey)
      .attach('file', PNG_1PX, { filename: 'pixel.png', contentType: 'image/png' });
    expect(noJwt.status).toBe(401);

    await createUser({
      id: 'usr-visitor',
      username: 'visitor',
      email: 'visitor@example.com',
      password: 'Password123!',
      role: 'visitor',
    });
    const token = await login('visitor', 'Password123!');
    const forbidden = await request(app)
      .post('/uploads')
      .set('x-api-key', apiKey)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_1PX, { filename: 'pixel.png', contentType: 'image/png' });
    expect(forbidden.status).toBe(403);
  });

  it('returns 404 for a missing upload id', async () => {
    const res = await request(app).get('/uploads/upl-0-0');
    expect(res.status).toBe(404);
  });
});
