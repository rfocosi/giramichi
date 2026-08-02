import { test, expect } from '@playwright/test';
import { getApiUrl } from '../../src/frontend/config.js';

test.describe('GIRAMICHI_API_URL Initialization Validation', () => {
  test('should throw error when GIRAMICHI_API_URL is missing', () => {
    expect(() => getApiUrl()).toThrow('GIRAMICHI_API_URL is not defined. Please set the GIRAMICHI_API_URL environment variable.');
  });
});
