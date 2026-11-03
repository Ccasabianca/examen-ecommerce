const request = require('supertest');
const app = require('../app');

const KEY = process.env.INTERNAL_API_KEY;

describe('Microservice stock-management', () => {
  test('/health est public', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('stock-management');
  });

  test('sans clé interne : 401', async () => {
    const res = await request(app).post('/update-stock').send({ productId: 'a', quantity: 1 });
    expect(res.status).toBe(401);
  });

  test('avec la clé : la demande est acceptée', async () => {
    const res = await request(app)
      .post('/update-stock')
      .set('x-internal-key', KEY)
      .send({ productId: 'abc', quantity: 2 });
    expect(res.status).toBe(200);
  });
});
