const http = require('http');
const request = require('supertest');
const app = require('../app');

const KEY = process.env.INTERNAL_API_KEY;

/** faux microservice : enregistre ce qu'il reçoit et répond 200 */
function fakeService(port) {
  const received = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      received.push({ method: req.method, url: req.url, headers: req.headers, body: raw });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({ received, close: () => new Promise((done) => server.close(done)) })
    );
  });
}

describe('Gateway', () => {
  let notify;
  let stock;

  beforeAll(async () => {
    notify = await fakeService(59881);
    stock = await fakeService(59882);
  });
  afterEach(() => {
    notify.received.length = 0;
    if (stock) stock.received.length = 0;
  });
  afterAll(async () => {
    await notify.close();
    if (stock) await stock.close();
  });

  test('/health est public', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('gateway');
  });

  test('sans clé interne ou avec une mauvaise clé : 401, rien ne part vers le microservice', async () => {
    const without = await request(app).post('/notify').send({ to: 'a@example.com' });
    const wrong = await request(app).post('/notify').set('x-internal-key', 'x').send({});
    expect(without.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(notify.received).toHaveLength(0);
  });

  test('/notify est relayé avec le chemin, le corps et la clé', async () => {
    const res = await request(app)
      .post('/notify')
      .set('x-internal-key', KEY)
      .send({ to: 'client@example.com', subject: 'Test', text: 'Bonjour' });
    expect(res.status).toBe(200);
    const [call] = notify.received;
    expect(call.method).toBe('POST');
    expect(call.url).toBe('/notify');
    expect(call.headers['x-internal-key']).toBe(KEY);
    expect(JSON.parse(call.body).to).toBe('client@example.com');
  });

  test('/update-stock est relayé vers stock-management', async () => {
    const res = await request(app)
      .post('/update-stock')
      .set('x-internal-key', KEY)
      .send({ productId: 'abc', quantity: 2 });
    expect(res.status).toBe(200);
    expect(stock.received[0].url).toBe('/update-stock');
    expect(JSON.parse(stock.received[0].body).quantity).toBe(2);
  });

  test('/health/deep exige la clé et rapporte chaque microservice', async () => {
    const anonymous = await request(app).get('/health/deep');
    const res = await request(app).get('/health/deep').set('x-internal-key', KEY);
    expect(anonymous.status).toBe(401);
    expect(res.status).toBe(200);
    expect(res.body.services.map((s) => s.status)).toEqual(['ok', 'ok']);
  });

  test('microservice arrêté : /health/deep en 503 et relais en 502 JSON', async () => {
    await stock.close();
    stock = null;
    const deep = await request(app).get('/health/deep').set('x-internal-key', KEY);
    const relay = await request(app)
      .post('/update-stock')
      .set('x-internal-key', KEY)
      .send({ productId: 'abc', quantity: 1 });
    expect(deep.status).toBe(503);
    expect(relay.status).toBe(502);
    expect(relay.body.message).toMatch(/injoignable/);
  });
});
