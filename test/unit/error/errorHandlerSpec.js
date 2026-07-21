'use strict';

const
  DownloadError = require('../../../lib/error/errors').DownloadError,
  WriteError = require('../../../lib/error/errors').WriteError,
  ExtractionError = require('../../../lib/error/errors').ExtractionError;

describe('errorHandler', function () {

  const underTest = require('../../../lib/error/errorHandler');

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  it('should throw a DownloadError', function () {
    const thrownError = {message: 'any error', statusCode: 401};
    try {
      underTest.handleDownloadError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(DownloadError));
    }
  });

  it('should throw a WriteError', function () {
    const thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleWriteError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(WriteError));
    }
  });

  it('should throw a ExtractionError', function () {
    const thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleExtractionError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(ExtractionError));
    }
  });


  it('should throw original WriteError', function () {
    const thrownError = new WriteError();
    try {
      underTest.handleDownloadError(thrownError);
    } catch(err) {
      expect(err).toBe(thrownError);
    }
  });
})
;
