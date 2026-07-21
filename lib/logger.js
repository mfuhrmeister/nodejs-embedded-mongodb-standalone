'use strict';

function info(prefix, message) {
  if (message === undefined) {
    console.log(prefix);
    return;
  }

  console.log(prefix, message);
}

function error(prefix, message) {
  if (message === undefined) {
    console.error(prefix);
    return;
  }

  console.error(prefix, message);
}

module.exports.info = info;
module.exports.error = error;
