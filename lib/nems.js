'use strict';

var
  downloadService = require('./distributer/downloadService'),
  extractionService = require('./distributer/extractionService');

function distribute(version, dir) {
  return downloadService
    .download(version, dir)
    .then(function (file) {
      return extractionService.extract(file, version, dir);
    });
}

function download(version, dir) {
  return downloadService.download(version, dir);
}

module.exports.distribute = distribute;
module.exports.download = download;