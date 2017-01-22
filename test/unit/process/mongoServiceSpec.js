'use strict';

var
  rewire = require('rewire'),
  events = require('events'),

  MONGOD_COMMAND = 'mongod',
  PARAMETER_DBPATH = '--dbpath',
  PARAMETER_PORT = '--port',
  PARAMETER_NOPREALLOC = '--noprealloc',
  PARAMETER_NOJOURNAL = '--nojournal',
  PARAMETER_SHUTDOWN = '--shutdown',

  ANY_DB_PATH = 'ANY_DB_PATH',
  ANY_PORT = 'ANY_PORT',
  ANY_PID = 12356,

  ANY_ERROR = 'ANY_ERROR',
  ANY_MONGO_ERROR = 'ANY_MONGO_ERROR',
  ANY_MONGO_MESSAGE = 'ANY_MONGO_MESSAGE',
  MONGO_WAITING = '[initandlisten] waiting for connections on port',
  MONGO_IS_ABSENT = 'mongo process does not exist',
  MONGO_SHUTDOWN_ERROR = 'could not create child process to stop mongo process';

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
          stdoutEventEmitter.emit('data', MONGO_WAITING);
        });
      }

      [
        {params: null, command: MONGOD_COMMAND},
        {params: [ANY_DB_PATH], command: [MONGOD_COMMAND, PARAMETER_DBPATH, ANY_DB_PATH].join(' ')},
        {params: [null, ANY_PORT], command: [MONGOD_COMMAND, PARAMETER_PORT, ANY_PORT].join(' ')},
        {params: [null, null, true], command: [MONGOD_COMMAND, PARAMETER_NOPREALLOC].join(' ')},
        {params: [null, null, false, true], command: [MONGOD_COMMAND, PARAMETER_NOJOURNAL].join(' ')}
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
        underTest.start().then(function () {
          done.fail('reject on error in mongo process should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ANY_MONGO_ERROR));
          done();
        });

        stderrEventEmitter.emit('data', ANY_MONGO_ERROR);
      });

      it('should resolve with info if mongo process has started', function (done) {

        underTest.start().then(function (processID) {
          expect(processID).toEqual(ANY_PID);
          done();
        }).catch(function () {
          done.fail('resolve with process id if mongo has started should have been resolved');
        });

        underTest.__set__('mongoProcess', {pid: ANY_PID});
        stdoutEventEmitter.emit('data', MONGO_WAITING);
      });

      it('should log mongo process messages', function (done) {
        underTest.start().then(function () {
          expect(loggerMock.info.calls.argsFor(0)[1]).toEqual(ANY_MONGO_MESSAGE);
          done();
        }).catch(function () {
          done.fail('resolve with info if mongo process has started should have been resolved');
        });

        stdoutEventEmitter.emit('message', ANY_MONGO_MESSAGE);
        stdoutEventEmitter.emit('data', MONGO_WAITING);
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
          expect(err).toEqual(new Error(MONGO_SHUTDOWN_ERROR));
          done();
        });
      });

      function testStopChildProcess(test) {
        it('should call exec on child_process with command ' + test.command, function (done) {
          underTest.stop.apply(this, test.params).then(function () {
            expect(childProcessMock.exec.calls.argsFor(0)[0]).toEqual(test.command);
            done();
          }).catch(function () {
            done.fail('exec child process with command ' + test.command + ' should have been resolved');
          });
        });
      }

      [
        {params: null, command: [MONGOD_COMMAND, PARAMETER_SHUTDOWN].join(' ')},
        {params: [ANY_DB_PATH], command: [MONGOD_COMMAND, PARAMETER_SHUTDOWN, PARAMETER_DBPATH, ANY_DB_PATH].join(' ')}
      ].forEach(testStopChildProcess);

    });

    it('should resolve with info if mongo process is absent', function (done) {
      underTest.stop().then(function (data) {
        expect(data).toEqual(MONGO_IS_ABSENT);
        done();
      }).catch(function () {
        done.fail('resolve with info if mongo process is absent should have been resolved');
      });
    });
  });
});
