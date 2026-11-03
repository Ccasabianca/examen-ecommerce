// backend/routes/orderRoutes.js
const express = require('express');
const {
  createOrder,
  deleteOrder,
  getOrders,
  getMyOrders,
  validateOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validators/schemas');

const router = express.Router();
const orderId = validate(schemas.orderIdParams, 'params');

router.get('/', authenticateToken, isAdmin, getOrders); // Accès pour administrateurs
router.get('/mine', authenticateToken, getMyOrders); // commandes du client connecté
router.post('/', authenticateToken, validate(schemas.createOrder), createOrder); // Accès pour utilisateurs connectés
// fix : suppression réservée aux administrateurs, comme l'annonçait le commentaire
router.delete('/:orderId', authenticateToken, isAdmin, orderId, deleteOrder); // Accès pour administrateurs
router.put('/:orderId/validate', authenticateToken, isAdmin, orderId, validateOrder); // Accès pour administrateurs
router.put('/:orderId/status', authenticateToken, isAdmin, orderId, validate(schemas.orderStatus), updateOrderStatus); // Accès pour administrateurs

module.exports = router;
