/** inscription, connexion et session @module controllers/authController */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');
const { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie } = require('../utils/token');

// fix : même temps de réponse quand le compte n'existe pas, comparaison avec un hachage factice
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 10);

/** POST /api/auth/login : pose le cookie de session, renvoie le nom et le rôle */
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  // fix : même message pour un compte inconnu et un mauvais mot de passe, plus d'énumération des comptes
  if (!user || !isMatch) {
    logger.warn('auth.login_failed', { username, ip: req.ip });
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  // fix : le jeton part dans un cookie httponly, plus dans le corps de la réponse ni dans le localStorage
  setAuthCookie(res, signToken(user));
  logger.info('auth.login', { userId: String(user._id), role: user.role, ip: req.ip });
  return res.json({ username: user.username, role: user.role });
};

/** POST /api/auth/register : crée un compte client */
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  // fix : nom et email vérifiés tous les deux (un nom déjà pris donnait un 500), doublon en 409
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(409).json({ message: "Ce nom d'utilisateur ou cet email est déjà utilisé." });
  }

  // fix : le rôle n'est jamais lu dans la requête, un compte créé ici est toujours un client
  const user = await User.create({ username, email, password, role: 'user' });
  logger.info('auth.register', { userId: String(user._id), ip: req.ip });
  return res.status(201).json({ message: 'Utilisateur créé avec succès.' });
};

/** POST /api/auth/logout : efface le cookie de session */
exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Déconnexion effectuée' });
};

/** GET /api/auth/me : sonde de session du front, toujours 200, user à null sans session valide */
exports.me = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.json({ user: null });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    logger.warn('auth.session_cookie_rejected', { reason: err.name, ip: req.ip });
    clearAuthCookie(res);
    return res.json({ user: null });
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    clearAuthCookie(res);
    return res.json({ user: null });
  }
  return res.json({ user: { username: user.username, role: user.role } });
};
