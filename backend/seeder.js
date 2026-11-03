// backend/seeder.js
// usage : node seeder.js [--reset]
// --reset vide les produits avant l'insertion ; sans lui, les produits ne sont insérés que si la collection est vide
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product'); // Assurez-vous que le chemin est correct
const User = require('./models/User');

dotenv.config({ quiet: true });

// Jeux de produits à insérer
const products = [
  {
    name: 'Ordinateur Portable',
    price: 1000,
    description: 'Un ordinateur portable performant pour tous vos besoins.',
    stock: 20,
  },
  {
    name: 'Smartphone',
    price: 700,
    description: 'Un smartphone moderne avec un écran OLED.',
    stock: 50,
  },
  {
    name: 'Casque Audio',
    price: 150,
    description: 'Un casque audio sans fil avec réduction de bruit.',
    stock: 30,
  },
  {
    name: 'Tablette',
    price: 400,
    description: 'Une tablette légère et puissante.',
    stock: 25,
  },
  {
    name: 'Clavier Mécanique',
    price: 120,
    description: 'Un clavier mécanique pour les gamers.',
    stock: 15,
  },
];

// fix : compte admin créé ici, mot de passe lu dans l'environnement (jamais dans le dépôt), admin existant conservé
async function seedAdmin() {
  const { ADMIN_USERNAME = 'admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    process.stdout.write('ADMIN_EMAIL ou ADMIN_PASSWORD absent : pas de compte admin créé\n');
    return;
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères');

  const existing = await User.findOne({ $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }] });
  if (existing) {
    process.stdout.write(`compte ${existing.username} déjà présent, inchangé\n`);
    return;
  }
  await User.create({ username: ADMIN_USERNAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  process.stdout.write(`compte admin ${ADMIN_USERNAME} créé\n`);
}

// Fonction pour insérer les produits
const seedProducts = async () => {
  // fix : un nouveau seed ne remet plus le stock à zéro en prod, sauf demande explicite
  if (process.argv.includes('--reset')) await Product.deleteMany();
  if ((await Product.countDocuments()) > 0) {
    process.stdout.write('produits déjà présents, inchangés (--reset pour les remplacer)\n');
    return;
  }
  await Product.insertMany(products);
  process.stdout.write('Jeux de produits insérés avec succès !\n');
};

// fix : connexion attendue avant les écritures, sortie propre en cas d'erreur
async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI est obligatoire');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  process.stdout.write(`MongoDB connecté pour le seed (base ${mongoose.connection.name})\n`);
  await seedProducts();
  await seedAdmin();
}

main()
  .catch((error) => {
    process.stderr.write(`Erreur lors du seed : ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
