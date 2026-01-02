// Jest setup file for E2E tests

// Increase timeout for E2E tests
jest.setTimeout(60000)

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/evzone_db'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.KAFKA_BROKERS = '' // Disable Kafka for tests

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// }

// Clean up after all tests
afterAll(async () => {
    // Add any global cleanup here
})

