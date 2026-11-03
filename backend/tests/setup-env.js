// variables des tests, posées avant le chargement de config/env (dotenv n'écrase pas une variable définie)
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/exam1_test';
process.env.JWT_SECRET = 'secret-de-test-suffisamment-long-0123456789abcdef';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'error';
process.env.GATEWAY_URL = 'http://127.0.0.1:59871';
process.env.INTERNAL_API_KEY = 'cle-interne-de-test-suffisamment-longue-0123456789';
process.env.GATEWAY_TIMEOUT_MS = '3000';
process.env.ADMIN_NOTIFY_EMAIL = 'admin@example.com';
