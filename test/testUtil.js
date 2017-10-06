'use strict';

var
  fs = require('fs-extra');

function mkdir(path) {
   fs.mkdirsSync(path);
}

function rm(path) {
  if (fs.pathExistsSync(path)) {
    fs.emptyDir(path, function() {
      fs.rmdir(path);
    });
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