const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');

const PASSWORD = 'motdepasse123';

async function connect() {
  await mongoose.connect(process.env.MONGO_URI);
}

async function clearDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** cookie de session renvoyé par une réponse, au format de l'en-tête Cookie */
function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return (Array.isArray(setCookie) ? setCookie : [setCookie]).map((c) => c.split(';')[0]).join('; ');
}

function createUser({ username = 'alice', role = 'user' } = {}) {
  return User.create({ username, email: `${username}@example.com`, password: PASSWORD, role });
}

async function loginAs(username) {
  const res = await request(app).post('/api/auth/login').send({ username, password: PASSWORD });
  return extractCookie(res);
}

function createProduct(overrides = {}) {
  return Product.create({
    name: 'Ordinateur Portable',
    price: 1000,
    description: 'Un ordinateur portable performant pour tous vos besoins.',
    stock: 20,
    ...overrides,
  });
}

module.exports = {
  app,
  request,
  PASSWORD,
  connect,
  clearDatabase,
  disconnect,
  extractCookie,
  createUser,
  loginAs,
  createProduct,
};
