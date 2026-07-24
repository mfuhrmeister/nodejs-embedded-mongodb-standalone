const DEFAULT_MONGODB_VERSION = '6.0.8';

function getDefaultVersion() {
  return DEFAULT_MONGODB_VERSION;
}

function getCliErrorMessage(err) {
  if (err && typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }

  return String(err);
}

export {
  DEFAULT_MONGODB_VERSION,
  getDefaultVersion,
  getCliErrorMessage
};
