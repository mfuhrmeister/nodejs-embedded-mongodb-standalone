'use strict';

function createError(name, message, code) {
  function ResponseError(message, statusCode) {
    if (!!message) {
      this.message = message;
    }
    if (!!statusCode) {
      this.statusCode = statusCode;
    }
  }
  ResponseError.prototype = Object.create(Error.prototype);
  ResponseError.prototype.constructor = ResponseError;
  ResponseError.prototype.name = name;
  ResponseError.prototype.message = message;
  ResponseError.prototype.statusCode = code;

  ResponseError.prototype.predicate = function(error) {
    return error && error.name && error.name == this.name;
  };

  return ResponseError;
}

module.exports.DownloadError = createError('DownloadError', 'Download went wrong!', 404);
module.exports.WriteError = createError('WriteError', 'Writing file went wrong!', 500);
module.exports.ExtractionError = createError('ExtractionError', 'Extracting file went wrong!', 500);
module.exports.MongoError = createError('MongoError', 'Starting mongo process went wrong!', 500);