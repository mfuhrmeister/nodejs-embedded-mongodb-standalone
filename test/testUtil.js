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

function killProcess(pid) {
  process.kill(pid, 'SIGTERM');
}

module.exports.createFolder = mkdir;
module.exports.deleteFolder = rm;
module.exports.killProcess = killProcess;