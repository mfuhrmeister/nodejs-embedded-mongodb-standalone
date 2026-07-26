import {
  DownloadError,
  WriteError,
  ExtractionError,
  isNemsError
} from '../error/errors.js';

function getErrorMessage(originalError) {
  if (originalError && typeof originalError.message === 'string' && originalError.message.length > 0) {
    return originalError.message;
  }

  return String(originalError);
}

function handleError(errorClass, originalError) {
  if (isNemsError(originalError)) {
    throw originalError;
  }

  throw new errorClass(
    getErrorMessage(originalError),
    originalError && originalError.statusCode
  );
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
