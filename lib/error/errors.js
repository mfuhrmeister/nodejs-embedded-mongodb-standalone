'use strict';

function createError(name, defaultMessage, defaultStatusCode) {
  function ResponseError(message, statusCode) {
    if (message !== undefined) {
      this.message = message;
    }

    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }

  ResponseError.prototype = Object.create(Error.prototype);
  ResponseError.prototype.constructor = ResponseError;
  ResponseError.prototype.name = name;
  ResponseError.prototype.message = defaultMessage;
  ResponseError.prototype.statusCode = defaultStatusCode;

  ResponseError.prototype.predicate = function (error) {
    return !!error && error.name === this.name;
  };

  return ResponseError;
}

module.exports = {
  DownloadError: createError('DownloadError', 'Download went wrong!', 404),
  WriteError: createError('WriteError', 'Writing file went wrong!', 500),
  ExtractionError: createError('ExtractionError', 'Extracting file went wrong!', 500),
  MongoError: createError('MongoError', 'Starting mongo process went wrong!', 500)
};
