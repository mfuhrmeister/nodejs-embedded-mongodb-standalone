import * as errors from '../../../lib/error/errors.js';

describe('errors', function () {
  it('should be defined', function () {
    expect(errors).toBeDefined();
  });

  function testError(expectedErrorObject) {
    describe(expectedErrorObject.name, function () {

      let error;

      beforeEach(function () {
        error = new errors[expectedErrorObject.name](expectedErrorObject.message);
      });

      describe('properties', function () {

        it('should be defined appropriately', function () {
          expect(error.name).toBe(expectedErrorObject.name);
          expect(error.message).toBe(expectedErrorObject.message);
          expect(error.statusCode).toBe(expectedErrorObject.statusCode);
          expect(error.errorCode).toBe(expectedErrorObject.errorCode);
          expect(error.isNemsError).toBeTrue();
          expect(error.predicate).toEqual(jasmine.any(Function));
        });

        it('predicate should return false, when called with another Error type', function () {
          const expectedError = new errors[expectedErrorObject.name]();
          expectedError.name = 'ANY_OTHER_ERROR';
          expectedError.errorCode = 'ANY_OTHER_CODE';
          expect(error.predicate(expectedError)).toBeFalsy();
        });

        it('predicate should return true, when called with same Error type', function () {
          const expectedError = new errors[expectedErrorObject.name]();
          expect(error.predicate(expectedError)).toBeTruthy();
        });

      });

      it('should be initialized with custom message and status code', function () {
        const
          expectedStatusCode = 999,
          expectedMessage = 'any additional error message';

        error = new errors[expectedErrorObject.name](expectedMessage, expectedStatusCode);

        expect(error.statusCode).toBe(expectedStatusCode);
        expect(error.message).toBe(expectedMessage);
      });
    });
  }

  const expectedErrors = [
    {
      name: 'DownloadError',
      message: 'Download went wrong!',
      statusCode: 404,
      errorCode: errors.ERROR_CODES.DOWNLOAD
    },
    {
      name: 'WriteError',
      message: 'Writing file went wrong!',
      statusCode: 500,
      errorCode: errors.ERROR_CODES.WRITE
    },
    {
      name: 'ExtractionError',
      message: 'Extracting file went wrong!',
      statusCode: 500,
      errorCode: errors.ERROR_CODES.EXTRACTION
    },
    {
      name: 'MongoError',
      message: 'Starting mongo process went wrong!',
      statusCode: 500,
      errorCode: errors.ERROR_CODES.MONGO
    }
  ];

  expectedErrors.forEach(function (errorObject) {
    testError(errorObject);
  });

  it('should identify typed nems errors with isNemsError', function () {
    expect(errors.isNemsError(new errors.DownloadError())).toBeTrue();
    expect(errors.isNemsError(new Error('plain error'))).toBeFalse();
    expect(errors.isNemsError({
      isNemsError: true,
      errorCode: 'UNKNOWN'
    })).toBeFalse();
  });
});
