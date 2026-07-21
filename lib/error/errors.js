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

export const DownloadError = createError('DownloadError', 'Download went wrong!', 404);
export const WriteError = createError('WriteError', 'Writing file went wrong!', 500);
export const ExtractionError = createError('ExtractionError', 'Extracting file went wrong!', 500);
export const MongoError = createError('MongoError', 'Starting mongo process went wrong!', 500);

export default {
  DownloadError: DownloadError,
  WriteError: WriteError,
  ExtractionError: ExtractionError,
  MongoError: MongoError
};
