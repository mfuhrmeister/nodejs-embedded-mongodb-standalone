'use strict';

describe('errors', function () {
  var errors = require('../../../lib/error/errors.js');

  it('should be defined', function () {
    expect(errors).toBeDefined();
  });

  function testError(expectedErrorObject) {
    describe(expectedErrorObject.name, function () {

      var error;

      beforeEach(function() {
        error = new errors[expectedErrorObject.name]();
      });

      describe('properties', function() {

        it('should be defined appropriately', function() {
          expect(error.name).toBe(expectedErrorObject.name);
          expect(error.message).toBe(expectedErrorObject.message);
          expect(error.statusCode).toBe(expectedErrorObject.statusCode);
          expect(error.predicate).toEqual(jasmine.any(Function));
        });

        it('predicate should return false, when called with another Error type', function () {
          var expectedError = new errors[expectedErrorObject.name]();
          expectedError.name = 'ANY_OTHER_ERROR';
          expect(error.predicate(expectedError)).toBeFalsy();
        });

        it('predicate should return true, when called with same Error type', function () {
          var expectedError = new errors[expectedErrorObject.name]();
          expect(error.predicate(expectedError)).toBeTruthy();
        });

      });

      it('should be initialized with custom message and status code', function () {
        var
          expectedStatusCode = 999,
          expectedMessage = 'any additional error message';

        error = new errors[expectedErrorObject.name](expectedMessage, expectedStatusCode);

        expect(error.statusCode).toBe(expectedStatusCode);
        expect(error.message).toBe(expectedMessage);
      });
    });
  }

  var expectedErrors = [
    {
      name : 'DownloadError',
      message: 'Download went wrong!',
      statusCode: 404
    },
    {
      name : 'WriteError',
      message: 'Writing file went wrong!',
      statusCode: 500
    },
    {
      name : 'ExtractionError',
      message: 'Extracting file went wrong!',
      statusCode: 500
    }
  ];

  expectedErrors.forEach(function(errorObject) {
    testError(errorObject);
  });
});