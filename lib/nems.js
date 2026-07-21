'use strict';

const
  downloadService = require('./distributer/downloadService'),
  extractionService = require('./distributer/extractionService'),
  mongoService = require('./process/mongoService');

async function distribute(version, dir) {
  const file = await downloadService.download(version, dir);
  return extractionService.extract(file, version, dir);
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

async function start(version, dir, port, noprealloc, nojournal, dbPath) {
  const extractionPath = await distribute(version, dir);
  const binPath = extractionPath + '/bin';

  return mongoService.start(binPath, port, noprealloc, nojournal, dbPath);
}

function stop(binPath, dbPath) {
  return mongoService.stop(binPath, dbPath);
}


module.exports.distribute = distribute;
module.exports.download = download;
module.exports.extract = extract;
module.exports.startMongo = startMongo;
module.exports.start = start;
module.exports.stop = stop;
