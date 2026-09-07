import { clearKeyCache, getKeyFileForVersion, getKeyUrl, BUNDLED_KEYS } from '../../../lib/distributor/gpgVerify.js';

describe('gpgVerify utility functions', function () {
  describe('getKeyFileForVersion', function () {
    it('should return 8.0 key for MongoDB 8.x versions', function () {
      expect(getKeyFileForVersion('8.0.9')).toEqual('server-8.0.asc');
      expect(getKeyFileForVersion('8.3.7')).toEqual('server-8.0.asc');
      expect(getKeyFileForVersion('8.1.0')).toEqual('server-8.0.asc');
    });

    it('should return 7.0 key for MongoDB 7.x versions', function () {
      expect(getKeyFileForVersion('7.0.0')).toEqual('server-7.0.asc');
      expect(getKeyFileForVersion('7.3.2')).toEqual('server-7.0.asc');
    });

    it('should return 6.0 key for MongoDB 6.x versions', function () {
      expect(getKeyFileForVersion('6.0.8')).toEqual('server-6.0.asc');
      expect(getKeyFileForVersion('6.1.0')).toEqual('server-6.0.asc');
    });

    it('should return 5.0 key for MongoDB 5.x versions', function () {
      expect(getKeyFileForVersion('5.0.23')).toEqual('server-5.0.asc');
    });

    it('should return 4.4 key for MongoDB 4.4', function () {
      expect(getKeyFileForVersion('4.4.29')).toEqual('server-4.4.asc');
    });

    it('should return null for unsupported versions', function () {
      expect(getKeyFileForVersion('3.6.0')).toBeNull();
      expect(getKeyFileForVersion('2.6.0')).toBeNull();
    });
  });

  describe('getKeyUrl', function () {
    it('should return correct URL for MongoDB 8.x', function () {
      expect(getKeyUrl('8.0.9')).toEqual('https://pgp.mongodb.com/server-8.0.asc');
    });

    it('should return correct URL for MongoDB 7.x', function () {
      expect(getKeyUrl('7.0.0')).toEqual('https://pgp.mongodb.com/server-7.0.asc');
    });

    it('should return correct URL for MongoDB 4.4', function () {
      expect(getKeyUrl('4.4.29')).toEqual('https://pgp.mongodb.com/server-4.4.asc');
    });
  });

  describe('BUNDLED_KEYS', function () {
    it('should have keys for supported MongoDB versions', function () {
      expect(BUNDLED_KEYS['8.0']).toBeDefined();
      expect(BUNDLED_KEYS['7.0']).toBeDefined();
      expect(BUNDLED_KEYS['6.0']).toBeDefined();
      expect(BUNDLED_KEYS['5.0']).toBeDefined();
      expect(BUNDLED_KEYS['4.4']).toBeDefined();
    });
  });

  describe('clearKeyCache', function () {
    it('should be callable without error', function () {
      expect(() => clearKeyCache()).not.toThrow();
    });
  });
});

// TODO: Integration tests for GPG verification are pending due to async mocking complexity
// These tests require proper mocking of the openpgp module which is imported directly
// Consider refactoring gpgVerify.js to accept dependencies for better testability
//
// Pending test scenarios:
// - Verify signature with bundled key
// - Verify signature with fetched key
// - Reject invalid signatures
// - Handle missing .sig files
// - Handle network errors
// - Cache keys correctly
