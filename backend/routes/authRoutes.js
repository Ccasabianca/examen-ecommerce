// backend/routes/authRoutes.js
const express = require('express');
const { login, register, logout, me } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const schemas = require('../validators/schemas');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimiters');

const router = express.Router();

router.post('/login', loginLimiter, validate(schemas.login), login);
router.post('/register', registerLimiter, validate(schemas.register), register);
router.post('/logout', logout);
router.get('/me', me);

module.exports = router;
