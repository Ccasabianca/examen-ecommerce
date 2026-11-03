jest.mock('../services/gatewayClient', () => ({
  call: jest.fn(),
  notify: jest.fn(),
  deepHealth: jest.fn(),
  reserveStock: jest.fn().mockResolvedValue({ message: 'Stock mis à jour' }),
  restoreStock: jest.fn().mockResolvedValue({ message: 'Stock restauré' }),
}));

const gateway = require('../services/gatewayClient');
const Order = require('../models/Order');
const { app, request, connect, clearDatabase, disconnect, createUser, loginAs, createProduct } = require('./helpers');

describe('Commandes', () => {
  let product;
  let cookie;
  let adminCookie;

  const orderBody = (overrides = {}) => ({
    // prix et total falsifiés : le serveur doit les ignorer
    items: [{ productId: String(product._id), quantity: 2, price: 0.01 }],
    total: 0.02,
    shippingAddress: { street: '12 rue des Lilas', city: 'Lyon', postalCode: '69001', country: 'France' },
    paymentMethod: 'Carte bancaire',
    shippingMethod: 'colissimo',
    ...overrides,
  });

  const placeOrder = (sessionCookie = cookie, body = orderBody()) =>
    request(app).post('/api/orders').set('Cookie', sessionCookie).send(body);

  beforeAll(connect);
  afterAll(disconnect);
  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    product = await createProduct();
    await createUser({ username: 'alice' });
    await createUser({ username: 'patron', role: 'admin' });
    cookie = await loginAs('alice');
    adminCookie = await loginAs('patron');
  });

  test('prix et total recalculés depuis la base, stock réservé, mails au client et à l\'admin', async () => {
    const res = await placeOrder();
    expect(res.status).toBe(201);
    expect(res.body.order.total).toBe(2000);
    expect(res.body.order.items[0]).toMatchObject({ name: 'Ordinateur Portable', price: 1000, quantity: 2 });
    expect(gateway.reserveStock).toHaveBeenCalledWith([{ productId: String(product._id), quantity: 2 }]);
    const recipients = gateway.notify.mock.calls.map(([mail]) => mail.to);
    expect(recipients).toEqual(expect.arrayContaining(['alice@example.com', 'admin@example.com']));
    expect(gateway.notify.mock.calls[0][0].text).toMatch(/Ordinateur Portable x 2/);
  });

  test('stock insuffisant : 409 sans réservation', async () => {
    const res = await placeOrder(cookie, orderBody({ items: [{ productId: String(product._id), quantity: 21 }] }));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Stock insuffisant/);
    expect(gateway.reserveStock).not.toHaveBeenCalled();
  });

  test('refus du microservice stock : 409 transmis, aucune commande enregistrée', async () => {
    const refusal = Object.assign(new Error('Stock insuffisant pour Ordinateur Portable (reste 0)'), {
      status: 409,
      expose: true,
    });
    gateway.reserveStock.mockRejectedValueOnce(refusal);
    const res = await placeOrder();
    expect(res.status).toBe(409);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('adresse et paiement manquants : 400 avec les champs (avant : 500)', async () => {
    const res = await placeOrder(cookie, { items: [{ productId: String(product._id), quantity: 1 }] });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['shippingAddress', 'paymentMethod', 'shippingMethod']));
  });

  test('sans session : 401', async () => {
    const res = await request(app).post('/api/orders').send(orderBody());
    expect(res.status).toBe(401);
  });

  test('mes commandes : seulement les miennes', async () => {
    await placeOrder();
    await createUser({ username: 'bob' });
    const bobCookie = await loginAs('bob');
    await placeOrder(bobCookie);

    const res = await request(app).get('/api/orders/mine').set('Cookie', bobCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const all = await request(app).get('/api/orders').set('Cookie', adminCookie);
    expect(all.body).toHaveLength(2);
  });

  test('statut inconnu refusé (avant : accepté), statut valide accepté et client prévenu', async () => {
    const { body } = await placeOrder();
    const id = body.order._id;
    jest.clearAllMocks();

    const unknown = await request(app).put(`/api/orders/${id}/status`).set('Cookie', adminCookie).send({ status: 'Volée' });
    expect(unknown.status).toBe(400);

    const shipped = await request(app).put(`/api/orders/${id}/status`).set('Cookie', adminCookie).send({ status: 'Expédiée' });
    expect(shipped.status).toBe(200);
    expect(shipped.body.order.status).toBe('Expédiée');
    expect(gateway.notify).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@example.com' }));
  });

  test('identifiant mal formé : 400 (avant : 500)', async () => {
    const res = await request(app).put('/api/orders/123/status').set('Cookie', adminCookie).send({ status: 'Expédiée' });
    expect(res.status).toBe(400);
  });

  test('validation : la commande passe en préparation (avant : rien ne changeait)', async () => {
    const { body } = await placeOrder();
    const res = await request(app).put(`/api/orders/${body.order._id}/validate`).set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('En cours de traitement');
  });

  test('suppression : 403 pour un client, 200 pour un admin avec le stock rendu (avant : requête pendante)', async () => {
    const { body } = await placeOrder();
    const id = body.order._id;

    const client = await request(app).delete(`/api/orders/${id}`).set('Cookie', cookie);
    expect(client.status).toBe(403);

    const admin = await request(app).delete(`/api/orders/${id}`).set('Cookie', adminCookie);
    expect(admin.status).toBe(200);
    expect(gateway.restoreStock).toHaveBeenCalledWith([{ productId: String(product._id), quantity: 2 }]);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('annulation : stock rendu une seule fois, plus de changement de statut ensuite', async () => {
    const { body } = await placeOrder();
    const id = body.order._id;

    const cancel = await request(app).put(`/api/orders/${id}/status`).set('Cookie', adminCookie).send({ status: 'Annulée' });
    expect(cancel.status).toBe(200);
    expect(gateway.restoreStock).toHaveBeenCalledTimes(1);

    const again = await request(app).put(`/api/orders/${id}/status`).set('Cookie', adminCookie).send({ status: 'Expédiée' });
    expect(again.status).toBe(409);
    expect(gateway.restoreStock).toHaveBeenCalledTimes(1);
  });

  test('stock saisi par l\'admin : 0 accepté, valeur négative refusée', async () => {
    const zero = await request(app).put(`/api/products/${product._id}/stock`).set('Cookie', adminCookie).send({ stock: 0 });
    expect(zero.status).toBe(200);
    expect(zero.body.product.stock).toBe(0);
    const negative = await request(app).put(`/api/products/${product._id}/stock`).set('Cookie', adminCookie).send({ stock: -5 });
    expect(negative.status).toBe(400);
  });
});
