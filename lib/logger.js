'use strict';

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

module.exports = {
  info: info,
  error: error
};
