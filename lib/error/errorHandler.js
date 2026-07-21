import {
  DownloadError,
  WriteError,
  ExtractionError
} from '../error/errors.js';

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

export const handleDownloadError = createErrorHandler(DownloadError);
export const handleWriteError = createErrorHandler(WriteError);
export const handleExtractionError = createErrorHandler(ExtractionError);

export default {
  handleDownloadError: handleDownloadError,
  handleWriteError: handleWriteError,
  handleExtractionError: handleExtractionError
};
