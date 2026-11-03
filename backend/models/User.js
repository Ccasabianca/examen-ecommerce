// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // fix : nom limité aux lettres, chiffres et . _ - (avant, du html passait et s'affichait chez l'admin)
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9._-]+$/,
  },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  password: { type: String, required: true },
  // fix : deux rôles possibles, 'user' par défaut
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
