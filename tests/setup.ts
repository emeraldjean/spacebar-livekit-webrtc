// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.LIVEKIT_URL = 'wss://test.livekit.io';
process.env.LIVEKIT_API_KEY = 'test-api-key';
process.env.LIVEKIT_API_SECRET = 'test-api-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock EventEmitter
jest.mock('events', () => {
  return {
    EventEmitter: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  };
});
