const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

describe('Infrastructure', () => {
  beforeAll(() => mongoose.connect(process.env.MONGO_URI));
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("GET /health répond 200 avec l'état de la base", async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });

  test('GET /api/products répond une liste', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('une route inconnue renvoie un 404 JSON avec un message', async () => {
    const res = await request(app).get('/api/inexistante');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.message).toMatch(/introuvable/);
  });

  test("CORS : origine autorisée reflétée, origine inconnue sans en-tête d'autorisation", async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    const blocked = await request(app).get('/health').set('Origin', 'http://site-malveillant.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('X-Powered-By masqué', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('chaîne complète : 503 propre si le gateway est injoignable', async () => {
    const res = await request(app).get('/api/health/deep');
    expect(res.status).toBe(503);
    expect(res.body.gateway.status).toBe('down');
  });
});
