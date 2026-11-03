const request = require('supertest');

jest.mock('../models/Product', () => ({
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../config/db', () => ({
  connectDB: jest.fn(),
  disconnectDB: jest.fn(),
  isConnected: jest.fn(),
}));

const Product = require('../models/Product');
const db = require('../config/db');
const logger = require('../utils/logger');
const app = require('../app');

const KEY = process.env.INTERNAL_API_KEY;
const P1 = '6ae9b38e77b79b21bf66f517';
const P2 = '6ae9b38e77b79b21bf66f518';

const post = (path, body) => request(app).post(path).set('x-internal-key', KEY).send(body);

// réponses 5xx attendues dans certains tests : pas de bruit dans la sortie
const quiet = () => {
  jest.spyOn(logger, 'log').mockImplementation(() => logger);
  jest.spyOn(logger, 'error').mockImplementation(() => logger);
};

beforeEach(() => {
  jest.resetAllMocks();
  db.isConnected.mockReturnValue(true);
});

afterEach(() => jest.restoreAllMocks());

describe('santé et accès', () => {
  test('/health est public : 200 avec la base connectée', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'stock-management', db: 'connected' });
  });

  test('/health : 503 si la base est déconnectée', async () => {
    quiet();
    db.isConnected.mockReturnValue(false);
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
  });

  test("sans clé interne : 401, le stock n'est pas touché", async () => {
    const res = await request(app)
      .post('/update-stock')
      .send({ items: [{ productId: P1, quantity: 1 }] });
    expect(res.status).toBe(401);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('route inconnue : 404 en json', async () => {
    const res = await request(app).get('/inconnue').set('x-internal-key', KEY);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/introuvable/);
  });
});

describe('POST /update-stock', () => {
  test('décrémente chaque ligne et renvoie le stock restant', async () => {
    Product.findOneAndUpdate
      .mockResolvedValueOnce({ _id: P1, stock: 19 })
      .mockResolvedValueOnce({ _id: P2, stock: 48 });

    const res = await post('/update-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P2, quantity: 2 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Stock mis à jour',
      items: [
        { productId: P1, stock: 19 },
        { productId: P2, stock: 48 },
      ],
    });
    expect(Product.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { _id: P1, stock: { $gte: 1 } },
      { $inc: { stock: -1 } },
      { new: true }
    );
    expect(Product.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: P2, stock: { $gte: 2 } },
      { $inc: { stock: -2 } },
      { new: true }
    );
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  test("fusionne les lignes d'un même produit", async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce({ _id: P1, stock: 17 });

    const res = await post('/update-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P1.toUpperCase(), quantity: 2 },
      ],
    });

    expect(res.status).toBe(200);
    expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: P1, stock: { $gte: 3 } },
      { $inc: { stock: -3 } },
      { new: true }
    );
  });

  test('stock insuffisant : 409 et les lignes déjà décrémentées sont remises', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce({ _id: P1, stock: 19 }).mockResolvedValueOnce(null);
    Product.findById.mockResolvedValueOnce({ _id: P2, name: 'Smartphone', stock: 1 });
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await post('/update-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P2, quantity: 5 },
      ],
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Stock insuffisant pour Smartphone (reste 1)');
    expect(Product.updateOne).toHaveBeenCalledTimes(1);
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: P1 }, { $inc: { stock: 1 } });
  });

  test('produit introuvable : 404', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    Product.findById.mockResolvedValueOnce(null);

    const res = await post('/update-stock', { items: [{ productId: P1, quantity: 1 }] });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe(`Produit introuvable : ${P1}`);
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  test('erreur de base en cours de route : 500 et lignes déjà décrémentées remises', async () => {
    quiet();
    Product.findOneAndUpdate
      .mockResolvedValueOnce({ _id: P1, stock: 19 })
      .mockRejectedValueOnce(new Error('connexion perdue'));
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await post('/update-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P2, quantity: 2 },
      ],
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Erreur interne du service de stock');
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: P1 }, { $inc: { stock: 1 } });
  });

  test.each([
    ['sans corps', undefined],
    ['sans lignes', { items: [] }],
    ['ancien format sans tableau', { productId: P1, quantity: 1 }],
    ['identifiant invalide', { items: [{ productId: 'abc', quantity: 1 }] }],
    ["objet à la place de l'identifiant", { items: [{ productId: { $gt: '' }, quantity: 1 }] }],
    ['quantité nulle', { items: [{ productId: P1, quantity: 0 }] }],
    ['quantité décimale', { items: [{ productId: P1, quantity: 1.5 }] }],
    ['quantité trop grande', { items: [{ productId: P1, quantity: 1001 }] }],
    [
      'quantité fusionnée trop grande',
      {
        items: [
          { productId: P1, quantity: 600 },
          { productId: P1, quantity: 600 },
        ],
      },
    ],
  ])('corps invalide (%s) : 400', async (_label, body) => {
    const req = request(app).post('/update-stock').set('x-internal-key', KEY);
    const res = body === undefined ? await req : await req.send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Données invalides');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('json mal formé : 400', async () => {
    const res = await request(app)
      .post('/update-stock')
      .set('x-internal-key', KEY)
      .set('Content-Type', 'application/json')
      .send('{"items": [');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Corps de requête JSON invalide');
  });
});

describe('POST /restore-stock', () => {
  test('rend le stock de chaque ligne', async () => {
    Product.find.mockResolvedValueOnce([{ _id: P1 }, { _id: P2 }]);
    Product.findByIdAndUpdate
      .mockResolvedValueOnce({ _id: P1, stock: 21 })
      .mockResolvedValueOnce({ _id: P2, stock: 52 });

    const res = await post('/restore-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P2, quantity: 2 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Stock restauré',
      items: [
        { productId: P1, stock: 21 },
        { productId: P2, stock: 52 },
      ],
    });
    expect(Product.findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      P1,
      { $inc: { stock: 1 } },
      { new: true }
    );
  });

  test('produit introuvable : 404 et aucun stock modifié', async () => {
    Product.find.mockResolvedValueOnce([{ _id: P1 }]);

    const res = await post('/restore-stock', {
      items: [
        { productId: P1, quantity: 1 },
        { productId: P2, quantity: 2 },
      ],
    });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe(`Produit introuvable : ${P2}`);
    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('corps invalide : 400', async () => {
    const res = await post('/restore-stock', { items: [{ productId: P1, quantity: -1 }] });
    expect(res.status).toBe(400);
    expect(Product.find).not.toHaveBeenCalled();
  });

  test('sans clé interne : 401', async () => {
    const res = await request(app)
      .post('/restore-stock')
      .send({ items: [{ productId: P1, quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});
