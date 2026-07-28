const request = require('supertest');

const { buildTestApp } = require('../testUtils/appFactory');
const { clearDatabase, disconnectDatabase } = require('../testUtils/dbHelpers');
const { stopInMemoryMongo } = require('../testUtils/mongoServer');
const { createApiKey, createUser } = require('../testUtils/authHelpers');
const Artwork = require('../../app/src/models/Artwork');
const ArtworkItem = require('../../app/src/models/ArtworkItem');

describe('autore editoriale degli item', () => {
  let app;
  let apiKey;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    apiKey = await createApiKey({ name: 'Item author key' });
    await createUser({ id: 'usr-author', fullName: 'Autore Uno', username: 'author', email: 'author@example.com', password: 'Password123!', role: 'author', assignedMuseumIds: ['mus-1'] });
    await createUser({ id: 'usr-visitor', fullName: 'Visitatore Uno', username: 'visitor', email: 'visitor@example.com', password: 'Password123!', role: 'visitor', assignedMuseumIds: ['mus-1'] });
    await Artwork.create({ id: 'art-1', museumId: 'mus-1', title: 'Opera' });
    await ArtworkItem.create({
      id: 'itm-1', artworkId: 'art-1', classification: { languageRegister: 'medio', fruitionLength: '2min' }, content: { title: 'Item' },
      creatorId: 'usr-author', lastUpdaterId: 'usr-author', status: 'published',
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopInMemoryMongo();
  });

  async function login(username) {
    const res = await request(app).post('/auth/login').set('x-api-key', apiKey).send({ username, password: 'Password123!' });
    return res.body.token;
  }
  const authed = (token, req) => req.set('x-api-key', apiKey).set('Authorization', `Bearer ${token}`);

  it('mostra l’autore risolto soltanto agli editor', async () => {
    const authorToken = await login('author');
    const editorList = await authed(authorToken, request(app).get('/artwork-items'));
    expect(editorList.status).toBe(200);
    expect(editorList.body.data[0].author).toEqual({ id: 'usr-author', fullName: 'Autore Uno', username: 'author' });

    const visitorToken = await login('visitor');
    const visitorList = await authed(visitorToken, request(app).get('/artwork-items'));
    expect(visitorList.status).toBe(200);
    expect(visitorList.body.data[0].author).toBeUndefined();
    expect(visitorList.body.data[0].creatorId).toBeUndefined();
    expect(visitorList.body.data[0].lastUpdaterId).toBeUndefined();
  });

  it('non permette di cambiare l’autore tramite payload di modifica', async () => {
    const token = await login('author');
    const res = await authed(token, request(app).put('/artwork-items/itm-1')).send({ creatorId: 'usr-visitor', content: { title: 'Item aggiornato' } });
    expect(res.status).toBe(200);
    expect((await ArtworkItem.findOne({ id: 'itm-1' }).lean()).creatorId).toBe('usr-author');
  });
});
