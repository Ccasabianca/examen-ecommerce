// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

exports.authenticateToken = (req, res, next) => {

  const token = req.headers['authorization']?.split(' ')[1];
  // fix : le jeton n'est plus écrit dans les logs
  if (!token) return res.sendStatus(401);

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('auth.token_rejected', { reason: err.name, ip: req.ip, path: req.originalUrl });
        return res.status(403).json({ error: true, message: 'Token invalide upd' });
      }
      req.user = user;
      next();
    });
  } catch (error) { 
    return res.status(403).json({ error: true, message: 'Token invalide' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès interdit' });
  next();
};