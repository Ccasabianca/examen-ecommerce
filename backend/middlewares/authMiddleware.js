/** authentification par cookie de session et contrôle du rôle @module middlewares/authMiddleware */
const { COOKIE_NAME, verifyToken } = require('../utils/token');
const logger = require('../utils/logger');

/** jeton du cookie de session, ou d'un en-tête Authorization: Bearer pour les clients d'api */
function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const [scheme, value] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && value ? value : null;
}

/** vérifie le jeton et remplit req.user ({ userId, role }) */
exports.authenticateToken = (req, res, next) => {
  const token = readToken(req);
  // fix : le jeton n'est plus écrit dans les logs, réponse json lisible par le front
  if (!token) return res.status(401).json({ message: 'Authentification requise' });

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    // fix : 401 au lieu de 403 pour un jeton invalide ou expiré, le front sait qu'il faut se reconnecter
    logger.warn('auth.token_rejected', { reason: err.name, ip: req.ip, path: req.originalUrl });
    return res.status(401).json({ message: 'Session expirée ou invalide, reconnectez-vous' });
  }
};

/** réserve la route aux administrateurs, rôle lu dans le jeton signé */
exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn('auth.forbidden', { userId: req.user?.userId, ip: req.ip, path: req.originalUrl });
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  return next();
};
