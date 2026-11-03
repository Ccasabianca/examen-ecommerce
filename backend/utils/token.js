/** jeton jwt et cookie de session @module utils/token */
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const COOKIE_NAME = 'token';
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * signe un jeton d'une heure avec l'identifiant et le rôle lus en base
 * @param {{ _id: *, role: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign({ userId: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

/**
 * vérifie la signature et l'expiration
 * @param {string} token
 * @returns {{ userId: string, role: string }}
 * @throws {Error} jeton invalide ou expiré
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

// fix : cookie httponly (invisible pour le javascript du navigateur), secure en https, samesite strict
function cookieOptions() {
  return { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/' };
}

/** pose le cookie de session */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

/** efface le cookie de session */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
