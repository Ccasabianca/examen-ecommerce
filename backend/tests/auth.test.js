const User = require('../models/User');
const { app, request, PASSWORD, connect, clearDatabase, disconnect, createUser, extractCookie } = require('./helpers');

describe('Authentification', () => {
  beforeAll(connect);
  afterAll(disconnect);
  beforeEach(clearDatabase);

  test("inscription : 201, rôle forcé à user même si le corps demande admin", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(201);
    const user = await User.findOne({ username: 'alice' });
    expect(user.role).toBe('user');
    expect(user.password).not.toBe(PASSWORD);
  });

  test('inscription vide : 400 avec un message par champ (avant : 500)', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field).sort()).toEqual(['email', 'password', 'username']);
  });

  test("nom d'utilisateur déjà pris : 409 (avant : 500)", async () => {
    await createUser({ username: 'alice' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'autre@example.com', password: PASSWORD });
    expect(res.status).toBe(409);
  });

  test('nom avec du html : 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: '<img src=x onerror=alert(1)>', email: 'x@example.com', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test('connexion : même 401 pour un compte inconnu et un mauvais mot de passe', async () => {
    await createUser({ username: 'alice' });
    const unknown = await request(app).post('/api/auth/login').send({ username: 'inconnu', password: PASSWORD });
    const wrong = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'mauvais-mot' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  test('injection NoSQL au login : 400, aucun compte trouvé', async () => {
    await createUser({ username: 'alice' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: { $ne: null }, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(extractCookie(res)).toBe('');
  });

  test('connexion réussie : cookie httponly, pas de jeton dans le corps', async () => {
    await createUser({ username: 'alice' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'alice', role: 'user' });
    const setCookie = res.headers['set-cookie'].join(';');
    expect(setCookie).toMatch(/token=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });

  test('session : /me renvoie le compte, /logout efface le cookie', async () => {
    await createUser({ username: 'alice' });
    const login = await request(app).post('/api/auth/login').send({ username: 'alice', password: PASSWORD });
    const cookie = extractCookie(login);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.user).toEqual({ username: 'alice', role: 'user' });

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'].join(';')).toMatch(/token=;/);

    const anonymous = await request(app).get('/api/auth/me');
    expect(anonymous.body.user).toBeNull();
  });

  test('jeton invalide : 401 (avant : 403) ; client sur une route admin : 403', async () => {
    const forged = await request(app).get('/api/orders/mine').set('Cookie', 'token=faux.jeton.signe');
    expect(forged.status).toBe(401);

    await createUser({ username: 'alice' });
    const login = await request(app).post('/api/auth/login').send({ username: 'alice', password: PASSWORD });
    const res = await request(app).get('/api/orders').set('Cookie', extractCookie(login));
    expect(res.status).toBe(403);
  });
});
