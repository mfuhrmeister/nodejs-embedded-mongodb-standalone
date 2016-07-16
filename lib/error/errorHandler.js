'use strict';

var
  DownloadError = require('../error/errors.js').DownloadError,
  WriteError = require('../error/errors.js').WriteError,
  ExtractionError = require('../error/errors.js').ExtractionError;

function handleError(errorClass, originalError) {
  if (!!originalError.predicate) {
    throw originalError;
  }
  throw new errorClass(originalError.message, originalError.statusCode);
}

function handleDownloadError(err) {
  handleError(DownloadError, err);
}

function handleWriteError(err) {
  handleError(WriteError, err);
}

function handleExtractionError(err) {
  handleError(ExtractionError, err);
}

module.exports.handleDownloadError = handleDownloadError;
module.exports.handleWriteError = handleWriteError;
module.exports.handleExtractionError = handleExtractionError;