'use strict';

var
  Ramda = require('ramda'),
  Promise = require('bluebird'),
  childProcess = require('child_process'),
  logger = require('npmlog'),

  mongoProcess;

function createMongoProcess(execCommand, resolve, reject) {
  if (mongoProcess) {
    resolve(mongoProcess.pid);
  }

  mongoProcess = childProcess.exec(execCommand);

  mongoProcess.stderr.on('data', function(err) {
    reject(new Error(err));
  });
  mongoProcess.stdout.on('data', function(data) {
    if (data.toString().indexOf('[initandlisten] waiting for connections on port') >= 0) {
      resolve(mongoProcess.pid);
    }
  });
  mongoProcess.stdout.on('message', function(message) {
    logger.info('nems', message);
  });
}

function start(dbPath, port, noprealloc, nojournal) {
  var execCommand = 'mongod';

  if (!!dbPath) {
    execCommand = [execCommand, '--dbpath', dbPath].join(' ');
  }
  if (!!port) {
    execCommand = [execCommand, '--port', port].join(' ');
  }
  if (!!noprealloc) {
    execCommand = execCommand.concat(' --noprealloc');
  }
  if (!!nojournal) {
    execCommand = execCommand.concat(' --nojournal');
  }

  return new Promise(Ramda.partial(createMongoProcess, [execCommand]));
}

module.exports.start = start;