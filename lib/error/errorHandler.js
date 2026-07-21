'use strict';

const {
  DownloadError,
  WriteError,
  ExtractionError
} = require('../error/errors.js');

function handleError(errorClass, originalError) {
  if (originalError.predicate) {
    throw originalError;
  }

  throw new errorClass(originalError.message, originalError.statusCode);
}

function createErrorHandler(errorClass) {
  return function handleTypedError(err) {
    handleError(errorClass, err);
  };
}

module.exports = {
  handleDownloadError: createErrorHandler(DownloadError),
  handleWriteError: createErrorHandler(WriteError),
  handleExtractionError: createErrorHandler(ExtractionError)
};
