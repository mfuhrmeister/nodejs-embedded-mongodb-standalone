'use strict';

var
  downloadService = require('./distributer/downloadService'),
  extractionService = require('./distributer/extractionService'),
  mongoService = require('./process/mongoService');

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

function extract(file, version, dir) {
  return extractionService.extract(file, version, dir);
}

function startMongo(dbPath, port, noprealloc, nojournal) {
  return mongoService.start(dbPath, port, noprealloc, nojournal);
}

function stopMongo(dbPath) {
  return mongoService.stop(dbPath);
}



module.exports.distribute = distribute;
module.exports.download = download;
module.exports.extract = extract;
module.exports.startMongo = startMongo;
module.exports.stopMongo = stopMongo;