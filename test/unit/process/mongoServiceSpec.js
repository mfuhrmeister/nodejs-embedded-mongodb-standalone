'use strict';

var
  rewire = require('rewire'),
  events = require('events'),
  path = require('path'),
  testUtil = require('../../testUtil.js'),

  MONGOD_COMMAND = 'mongod',
  PARAMETER_DBPATH = '--dbpath',
  PARAMETER_PORT = '--port',
  PARAMETER_NOPREALLOC = '--noprealloc',
  PARAMETER_NOJOURNAL = '--nojournal',
  PARAMETER_SHUTDOWN = '--shutdown',

  ANY_BIN_PATH = 'ANY_BIN_PATH',
  ANY_DB_PATH = 'ANY_DB_PATH',
  ANY_PORT = 'ANY_PORT',
  ANY_PID = 12356,

  ANY_ERROR = 'ANY_ERROR',
  ANY_MONGO_ERROR = 'ANY_MONGO_ERROR',
  ANY_MONGO_MESSAGE = 'ANY_MONGO_MESSAGE',
  MESSAGE_MONGO_WAITING = '[initandlisten] waiting for connections on port',
  MESSAGE_MONGO_KILLING_PROCESS = 'killing process with pid',
  MESSAGE_MONGO_INIT_EXCEPTION = '[initandlisten] exception in initAndListen',
  MESSAGE_MONGO_BAD_PORT = 'bad --port number',
  MESSAGE_MONGO_ADDR_IN_USE = 'addr already in use',
  MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with dbpath',

  SUCCESS_MESSAGE_MONGO_SHUTDOWN = 'The mongodb instance has been shutdown!',

  ERROR_MESSAGE_MONGO_START_FAILED = 'could not start mongo process: ',
  ERROR_MESSAGE_MONGO_SHUTDOWN = 'could not create child process to stop mongo process',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?',
  ERROR_MESSAGE_MONGO_BAD_PORT = 'The port you used is not allowed. See mongodb docs.',
  ERROR_MESSAGE_MONGO_ADDR_IN_USE  = 'The port you used is already in use.',
  ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with the given dbpath.';

describe('mongoService', function () {

  var
    underTest,
    stdoutEventEmitter,
    stderrEventEmitter,
    childProcessMock,
    loggerMock;

  beforeEach(function () {
    underTest = rewire('../../../lib/process/mongoService.js');

    stderrEventEmitter = new events.EventEmitter();
    stdoutEventEmitter = new events.EventEmitter();

    childProcessMock = jasmine.createSpyObj('childProcess', ['exec']);
    childProcessMock.exec.and.returnValue({stderr: stderrEventEmitter, stdout: stdoutEventEmitter});

    loggerMock = jasmine.createSpyObj('logger', ['info']);

    underTest.__set__('childProcess', childProcessMock);
    underTest.__set__('mongoProcess', undefined);
    underTest.__set__('logger', loggerMock);
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });


  describe('start', function () {

    describe('child process execution', function () {

      it('should reject when anything throws', function (done) {
        childProcessMock.exec.and.throwError(ANY_ERROR);

        underTest.start().then(function () {
          done.fail('reject when anything throws should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ANY_ERROR));
          done();
        });
      });

      function testStartChildProcess(test) {
        it('should call exec on child_process with command ' + test.command, function (done) {
          underTest.start.apply(this, test.params).then(function () {
            expect(childProcessMock.exec.calls.argsFor(0)[0]).toEqual(test.command);
            done();
          }).catch(function () {
            done.fail('exec child process with command ' + test.command + ' should have been resolved');
          });

          underTest.__set__('mongoProcess', {pid: ANY_PID});
          stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
        });
      }

      [
        { params: null, command: MONGOD_COMMAND},
        { params: [ANY_BIN_PATH],
          command: [testUtil.escapePath(path.join(ANY_BIN_PATH, MONGOD_COMMAND))].join(' ')
        },
        { params: [null, ANY_PORT], command: [MONGOD_COMMAND, PARAMETER_PORT, ANY_PORT].join(' ')},
        { params: [null, null, true], command: [MONGOD_COMMAND, PARAMETER_NOPREALLOC].join(' ')},
        { params: [null, null, false, true], command: [MONGOD_COMMAND, PARAMETER_NOJOURNAL].join(' ')},
        { params: [null, null, false, false, ANY_DB_PATH],
          command: [MONGOD_COMMAND, PARAMETER_DBPATH, testUtil.escapePath(ANY_DB_PATH)].join(' ')
        }
      ].forEach(testStartChildProcess);
    });

    describe('mongo process', function () {

      it('should resolve with process id if mongo has already started', function (done) {
        underTest.__set__('mongoProcess', {pid: ANY_PID});

        underTest.start().then(function (processID) {
          expect(processID).toEqual(ANY_PID);
          done();
        }).catch(function () {
          done.fail('resolve with process id if mongo has already started should have been resolved');
        });
      });

      it('should reject on error in mongo process', function (done) {
        var ANY_ROOT_CAUSE_MESSAGE = 'any error';

        underTest.start().then(function () {
          done.fail('reject on error in mongo process should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_FAILED + ANY_ROOT_CAUSE_MESSAGE));
          done();
        });

        stderrEventEmitter.emit('data', ANY_ROOT_CAUSE_MESSAGE);
      });

      it('should reject on mongo may be already started', function (done) {

        underTest.start().then(function () {
          done.fail('reject on mongo may be already started should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_INSTANCE_EXIST));
          done();
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_INIT_EXCEPTION);
      });

      it('should reject on bad port number', function (done) {

        underTest.start().then(function () {
          done.fail('reject on bad port number should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_BAD_PORT));
          done();
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_BAD_PORT);
      });

      it('should reject on address already in use', function (done) {

        underTest.start().then(function () {
          done.fail('reject on address already in use should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_FAILED + ERROR_MESSAGE_MONGO_ADDR_IN_USE));
          done();
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_ADDR_IN_USE);
      });

      it('should resolve with info if mongo process has started', function (done) {

        underTest.start().then(function (processID) {
          expect(processID).toEqual(ANY_PID);
          done();
        }).catch(function () {
          done.fail('resolve with process id if mongo has started should have been resolved');
        });

        underTest.__set__('mongoProcess', {pid: ANY_PID});
        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
      });
    });
  });

  describe('stop', function() {

    describe('child process execution', function () {

      beforeEach(function(){
        underTest.__set__('mongoProcess', true);
      });

      it('should reject when anything throws', function (done) {
        childProcessMock.exec.and.throwError(ANY_ERROR);

        underTest.stop().then(function () {
          done.fail('reject when anything throws should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ANY_ERROR));
          done();
        });
      });

      it('should reject when child process creation failed', function (done) {
        childProcessMock.exec.and.returnValue(undefined);

        underTest.stop().then(function () {
          done.fail('reject when child process creation failed should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_SHUTDOWN));
          done();
        });
      });

      it('should reject on unknown dbPath', function (done) {
        underTest.stop().then(function () {
          done.fail('reject on unknown dbPath should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
          done();
        });

        stderrEventEmitter.emit('data', MESSAGE_MONGO_UNKNOWN_DB_PATH);
      });

      it('should resolve on shutdown', function (done) {
        underTest.stop().then(function (message) {
          expect(message).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          done();
        }).catch(function () {
          done.fail('shutdown should have been resolved');
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
      });

      function testStopChildProcess(test) {
        it('should call exec on child_process with command ' + test.command, function (done) {
          underTest.stop.apply(this, test.params).then(function () {
            expect(childProcessMock.exec.calls.argsFor(0)[0]).toEqual(test.command);
            done();
          }).catch(function () {
            done.fail('exec child process with command ' + test.command + ' should have been resolved');
          });

          stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
        });
      }

      [
        { params: null, command: [MONGOD_COMMAND, PARAMETER_SHUTDOWN].join(' ')},
        { params: [ANY_BIN_PATH],
          command: [
            testUtil.escapePath(path.join(ANY_BIN_PATH, MONGOD_COMMAND)),
            PARAMETER_SHUTDOWN
          ].join(' ')},
        { params: [ANY_BIN_PATH, ANY_DB_PATH],
          command: [
            testUtil.escapePath(path.join(ANY_BIN_PATH, MONGOD_COMMAND)),
            PARAMETER_DBPATH,
            testUtil.escapePath(ANY_DB_PATH),
            PARAMETER_SHUTDOWN
          ].join(' ')}
      ].forEach(testStopChildProcess);

    });
  });

});
