function write(logMethod, prefix, message) {
  if (message === undefined) {
    logMethod(prefix);
    return;
  }

  logMethod(prefix, message);
}

function info(prefix, message) {
  write(console.log, prefix, message);
}

function error(prefix, message) {
  write(console.error, prefix, message);
}

const logger = {
  info: info,
  error: error
};

export { info, error };
export default logger;
