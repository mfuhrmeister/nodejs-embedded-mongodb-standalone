'use strict';

const
  fs = require('fs');

function mkdir(path) {
  fs.mkdirSync(path, { recursive: true });
}

function rm(path) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true, force: true });
  }
}

function killProcess(pid, hard) {
  process.kill(pid, (!!hard) ? 'SIGKILL' : 'SIGTERM');
}

function escapePath(dbPath) {
  return '"' + dbPath + '"';
}

module.exports.createFolder = mkdir;
module.exports.deleteFolder = rm;
module.exports.killProcess = killProcess;
module.exports.escapePath = escapePath;
