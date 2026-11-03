// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // modèle utilisateur
require('dotenv').config();
const axios = require('axios');
const authLog = require('debug')('authRoutes:console')
const logger = require('../utils/logger');
//const sendEmail = require('../services/emailService');

// fix : plus de mot de passe, de hachage ni de jeton dans les logs de debug
exports.login = async (req, res) => {
  const { username, password } = req.body;
  authLog(`tentative de connexion pour ${username}`);


  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    logger.info('auth.login', { userId: String(user._id), role: user.role, ip: req.ip });

    res.json({ token, role: user.role, username: user.username });
  } catch (error) {
    logger.error(`Erreur lors de la connexion : ${error.message}`);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  authLog(`inscription demandée pour ${username}`);

  try {
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Créer un nouvel utilisateur
    const user = new User({ username, email, password });
    await user.save();

    logger.info('auth.register', { userId: String(user._id), ip: req.ip });

    // Envoyer un email de bienvenue
    // await sendEmail(
    //   email,
    //   'Bienvenue dans notre application',
    //   `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`
    // );

    // await axios.post('http://localhost:4002/notify', {
    //   to: email,
    //   subject: 'Bienvenue dans notre application',
    //   text: `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`,
    // });

    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    logger.error(`Erreur lors de l'inscription : ${error.message}`);
    res.status(500).json({ message: 'Une erreur est survenue.' });
  }
};