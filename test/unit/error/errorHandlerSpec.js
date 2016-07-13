'use strict';

var
  DownloadError = require('../../../lib/error/errors').DownloadError,
  WriteError = require('../../../lib/error/errors').WriteError;

describe('errorHandler', function () {

  var underTest = require('../../../lib/error/errorHandler');

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });

  it('should throw a DownloadError', function () {
    var thrownError = {statusCode: 401};
    try {
      underTest.handleDownloadError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(DownloadError));
    }
  });


  it('should throw a WriteError', function () {
    var thrownError = {statusCode: 500};
    try {
      underTest.handleWriteError(thrownError);
    } catch(err) {
      expect(err).toEqual(jasmine.any(WriteError));
    }
  });
})
;