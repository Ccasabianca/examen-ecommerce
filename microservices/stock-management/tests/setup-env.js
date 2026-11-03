process.env.NODE_ENV = 'test';
process.env.INTERNAL_API_KEY = 'cle-interne-de-test-suffisamment-longue-0123456789';
// jamais contactée : le modèle Product et la connexion sont simulés dans les tests
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/stock_test';
process.env.LOG_LEVEL = 'error';
