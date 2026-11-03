/** appels au gateway, seul point d'entrée vers les microservices @module services/gatewayClient */
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * requête json vers le gateway avec la clé interne et un délai maximal
 * @returns {Promise<object>} corps de la réponse
 * @throws {Error} status 503 si le gateway est injoignable, statut d'origine sinon
 */
async function call(method, path, body, timeoutMs = config.gatewayTimeoutMs) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(`${config.gatewayUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-internal-key': config.internalApiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? `pas de réponse en ${timeoutMs} ms` : err.message;
    logger.error('gateway.unreachable', { method, path, reason, durationMs: Date.now() - started });
    const error = new Error('Service momentanément indisponible, réessayez dans une minute');
    error.status = 503;
    error.expose = true;
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  logger.info('gateway.call', { method, path, status: res.status, durationMs: Date.now() - started });
  if (!res.ok) {
    const error = new Error(data.message || 'Erreur du microservice');
    error.status = res.status === 400 || res.status === 409 ? res.status : 502;
    error.expose = true;
    throw error;
  }
  return data;
}

/** envoie un mail sans bloquer l'appelant : un échec est journalisé, la commande reste valide */
function notify({ to, subject, text }) {
  if (!to) {
    logger.warn('notification.skipped', { reason: 'destinataire non configuré', subject });
    return;
  }
  call('POST', '/notify', { to, subject, text }).catch((err) =>
    logger.error('notification.failed', { subject, reason: err.message })
  );
}

/** état du gateway et des microservices (réveille aussi les services gratuits endormis) */
function deepHealth() {
  return call('GET', '/health/deep', null, 150000);
}

/**
 * réserve le stock de chaque ligne, tout ou rien, par le microservice stock
 * @param {Array<Object>} items lignes { productId, quantity }
 * @throws {Error} 409 si un produit manque, 503 si le service est injoignable
 */
function reserveStock(items) {
  return call('POST', '/update-stock', { items });
}

/** rend le stock d'une commande non enregistrée, annulée ou supprimée */
function restoreStock(items) {
  return call('POST', '/restore-stock', { items });
}

module.exports = { call, notify, deepHealth, reserveStock, restoreStock };
