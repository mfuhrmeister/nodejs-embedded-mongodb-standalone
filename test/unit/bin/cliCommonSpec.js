import {
  DEFAULT_MONGODB_VERSION,
  getCliErrorMessage,
  getDefaultVersion
} from '../../../bin/cliCommon.js';

describe('cliCommon', function () {

  describe('getDefaultVersion', function () {
    it('should return the supported default mongodb version', function () {
      expect(getDefaultVersion()).toEqual(DEFAULT_MONGODB_VERSION);
      expect(getDefaultVersion()).toEqual('6.0.8');
    });
  });

  describe('getCliErrorMessage', function () {
    it('should return the error message for Error instances', function () {
      expect(getCliErrorMessage(new Error('any error message'))).toEqual('any error message');
    });

    it('should stringify non Error values', function () {
      expect(getCliErrorMessage('any error value')).toEqual('any error value');
    });
  });

});
