'use strict';

var
  Ramda = require('ramda'),
  Promise = require('bluebird'),
  childProcess = require('child_process'),
  logger = require('npmlog'),

  MongoError = require('../error/errors').MongoError,

  mongoProcess,
  MESSAGE_MONGO_WAITING = '[initandlisten] waiting for connections on port',
  MESSAGE_MONGO_INIT_EXCEPTION = '[initandlisten] exception in initAndListen',

  ERROR_MESSAGE_MONGO_START_FAILED = 'could not start mongo process: ',
  ERROR_MESSAGE_MONGO_SHUTDOWN = 'could not create child process to stop mongo process',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?';

function createMongoProcess(execCommand, resolve, reject) {
  if (mongoProcess) {
    resolve(mongoProcess.pid);
  }

  mongoProcess = childProcess.exec(execCommand);

  mongoProcess.stderr.on('data', function(err) {
    reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + err));
  });
  mongoProcess.stdout.on('data', function(data) {
    if (data.toString().indexOf(MESSAGE_MONGO_INIT_EXCEPTION) >= 0) {
      reject(new MongoError(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_INSTANCE_EXIST));
    }
    if (data.toString().indexOf(MESSAGE_MONGO_WAITING) >= 0) {
      resolve(mongoProcess.pid);
    }
  });
  mongoProcess.stdout.on('message', function(message) {
    logger.info('nems', message);
  });
}

function shutdownMongoProcess(execCommand, resolve, reject) {
  var cp = childProcess.exec(execCommand);
  if(!cp) {
    reject(new MongoError(ERROR_MESSAGE_MONGO_SHUTDOWN));
  }
  mongoProcess = undefined;
  resolve();
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

function stop(dbPath) {
  var execCommand = 'mongod --shutdown';

  if (!!dbPath) {
    execCommand = [execCommand, '--dbpath', dbPath].join(' ');
  }

  return new Promise(Ramda.partial(shutdownMongoProcess, [execCommand]));
}

module.exports.start = start;
module.exports.stop = stop;