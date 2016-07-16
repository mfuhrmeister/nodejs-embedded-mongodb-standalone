'use strict';

var
  DownloadError = require('../../../lib/error/errors').DownloadError,
  WriteError = require('../../../lib/error/errors').WriteError,
  ExtractionError = require('../../../lib/error/errors').ExtractionError;

describe('errorHandler', function () {

  var underTest = require('../../../lib/error/errorHandler');

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  it('should throw a DownloadError', function () {
    var thrownError = {message: 'any error', statusCode: 401};
    try {
      underTest.handleDownloadError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(DownloadError));
    }
  });

  it('should throw a WriteError', function () {
    var thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleWriteError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(WriteError));
    }
  });

  it('should throw a ExtractionError', function () {
    var thrownError = {message: 'any error', statusCode: 500};
    try {
      underTest.handleExtractionError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(ExtractionError));
    }
  });


  it('should throw original WriteError', function () {
    var thrownError = new WriteError();
    try {
      underTest.handleDownloadError(thrownError);
    } catch(err) {
      expect(err).toBe(thrownError);
    }
  });
})
;