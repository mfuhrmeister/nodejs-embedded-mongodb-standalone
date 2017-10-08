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

function startMongo(binPath, port, noprealloc, nojournal, dbPath) {
  return mongoService.start(binPath, port, noprealloc, nojournal, dbPath);
}

function start(version, dir, port, noprealloc, nojournal, dbPath) {
  return distribute(version, dir).then(function(path) {
    var binPath = path + '/bin';
    return mongoService.start(binPath, port, noprealloc, nojournal, dbPath);
  });
}

function stop(dbPath) {
  return mongoService.stop(dbPath);
}


module.exports.distribute = distribute;
module.exports.download = download;
module.exports.extract = extract;
module.exports.startMongo = startMongo;
module.exports.start = start;
module.exports.stop = stop;
