// tests/jest.setup.env.js
process.env.NODE_ENV = 'test';

// Secrets "fake" para tests (NO reales)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_32bytes_minimum_length__';

// Si tu auth usa otro nombre (p.ej. ACCESS_TOKEN_SECRET), setéalo también:
process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

// Si tienes refresh secret/cookies/etc, opcional:
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_32bytes_minimum_length__';
