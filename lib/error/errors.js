const ERROR_CODES = Object.freeze({
  DOWNLOAD: 'NEMS_DOWNLOAD_ERROR',
  WRITE: 'NEMS_WRITE_ERROR',
  EXTRACTION: 'NEMS_EXTRACTION_ERROR',
  MONGO: 'NEMS_MONGO_ERROR'
});

const NEMS_ERROR_CODES = new Set(Object.values(ERROR_CODES));

function createError(name, errorCode, defaultMessage, defaultStatusCode) {
  function ResponseError(message, statusCode) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResponseError);
    }

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
  ResponseError.prototype.errorCode = errorCode;
  ResponseError.prototype.isNemsError = true;

  ResponseError.prototype.predicate = function (error) {
    return !!error &&
      error.name === this.name &&
      error.errorCode === this.errorCode;
  };

  return ResponseError;
}

function isNemsError(error) {
  return !!error &&
    error.isNemsError === true &&
    NEMS_ERROR_CODES.has(error.errorCode);
}

export const DownloadError = createError('DownloadError', ERROR_CODES.DOWNLOAD, 'Download went wrong!', 404);
export const WriteError = createError('WriteError', ERROR_CODES.WRITE, 'Writing file went wrong!', 500);
export const ExtractionError = createError('ExtractionError', ERROR_CODES.EXTRACTION, 'Extracting file went wrong!', 500);
export const MongoError = createError('MongoError', ERROR_CODES.MONGO, 'Starting mongo process went wrong!', 500);
export { ERROR_CODES, isNemsError };

export default {
  DownloadError: DownloadError,
  WriteError: WriteError,
  ExtractionError: ExtractionError,
  MongoError: MongoError,
  ERROR_CODES: ERROR_CODES,
  isNemsError: isNemsError
};
