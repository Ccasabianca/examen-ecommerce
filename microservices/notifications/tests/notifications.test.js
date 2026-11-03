const request = require('supertest');
const app = require('../app');
const { outbox } = require('../services/mailer');

const KEY = process.env.INTERNAL_API_KEY;
const mail = { to: 'client@example.com', subject: 'Nouvelle Commande Créée', text: 'Bonjour' };

describe('Microservice notifications', () => {
  afterEach(() => {
    outbox.length = 0;
  });

  test('/health est public', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('notifications');
  });

  test('sans clé interne : 401, aucun mail', async () => {
    const res = await request(app).post('/notify').send(mail);
    expect(res.status).toBe(401);
    expect(outbox).toHaveLength(0);
  });

  test("injection d'en-têtes dans l'adresse refusée (400)", async () => {
    const res = await request(app)
      .post('/notify')
      .set('x-internal-key', KEY)
      .send({ ...mail, to: 'victime@example.com\r\nBcc: tous@example.com' });
    expect(res.status).toBe(400);
    expect(outbox).toHaveLength(0);
  });

  test('sujet sur plusieurs lignes refusé (400)', async () => {
    const res = await request(app)
      .post('/notify')
      .set('x-internal-key', KEY)
      .send({ ...mail, subject: 'Commande\r\nBcc: x@example.com' });
    expect(res.status).toBe(400);
  });

  test('envoi valide : 200 et mail parti au bon destinataire', async () => {
    const res = await request(app).post('/notify').set('x-internal-key', KEY).send(mail);
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe('client@example.com');
  });
});
