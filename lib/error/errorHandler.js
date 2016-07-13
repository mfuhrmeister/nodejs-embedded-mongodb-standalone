'use strict';

var
  DownloadError = require('../error/errors.js').DownloadError,
  WriteError = require('../error/errors.js').WriteError;

function handleError(errorClass, originalError) {
  if (!!originalError.predicate) {
    throw originalError;
  }
  throw new errorClass(originalError.statusCode);
}

function handleDownloadError(err) {
  handleError(DownloadError, err);
}

function handleWriteError(err) {
  handleError(WriteError, err);
}

module.exports.handleDownloadError = handleDownloadError;
module.exports.handleWriteError = handleWriteError;