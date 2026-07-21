import {
  DownloadError,
  WriteError,
  ExtractionError
} from '../../../lib/error/errors.js';
import underTest from '../../../lib/error/errorHandler.js';

describe('errorHandler', function () {
  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  it('should throw a DownloadError', function () {
    const thrownError = {message: 'any error', statusCode: 401};
    try {
      underTest.handleDownloadError(thrownError);
    } catch (err) {
      expect(err).toEqual(jasmine.any(DownloadError));
    }
  });

  it('should throw a WriteError', function () {
    const thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleWriteError(thrownError);
    } catch (err) {
      expect(err).toEqual(jasmine.any(WriteError));
    }
  });

  it('should throw a ExtractionError', function () {
    const thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleExtractionError(thrownError);
    } catch (err) {
      expect(err).toEqual(jasmine.any(ExtractionError));
    }
  });


  it('should throw original WriteError', function () {
    const thrownError = new WriteError();
    try {
      underTest.handleDownloadError(thrownError);
    } catch (err) {
      expect(err).toBe(thrownError);
    }
  });
});
