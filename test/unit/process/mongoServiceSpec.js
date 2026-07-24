import events from 'events';
import path from 'path';

import { createMongoService } from '../../../lib/process/mongoService.js';

const
  MONGOD_COMMAND = 'mongod',
  PARAMETER_DBPATH = '--dbpath',
  PARAMETER_PORT = '--port',
  PARAMETER_NOPREALLOC = '--noprealloc',
  PARAMETER_NOJOURNAL = '--nojournal',
  PARAMETER_PIDFILE = '--pidfilepath',
  PARAMETER_SHUTDOWN = '--shutdown',

  ANY_BIN_PATH = 'ANY_BIN_PATH',
  ANY_BIN_PATH_WITH_SPECIALS = 'ANY_BIN_PATH "quoted" & unsafe',
  ANY_DB_PATH = 'ANY_DB_PATH',
  ANY_DB_PATH_WITH_SPECIALS = 'ANY_DB_PATH "quoted" & unsafe',
  ANY_PORT = 'ANY_PORT',
  ANY_PID = 12356,
  ANY_PID_FILE_PATH = path.join(ANY_BIN_PATH, 'mongod.pid'),
  ANY_DB_PID_FILE_PATH = path.join(ANY_DB_PATH, 'mongod.pid'),

  ANY_ERROR = 'ANY_ERROR',
  MESSAGE_MONGO_WAITING = '[initandlisten] waiting for connections on port',
  MESSAGE_MONGO_WAITING_MODERN = '"msg":"Waiting for connections"',
  MESSAGE_MONGO_KILLING_PROCESS = 'killing process with pid',
  MESSAGE_MONGO_INIT_EXCEPTION = '[initandlisten] exception in initAndListen',
  MESSAGE_MONGO_BAD_PORT = 'bad --port number',
  MESSAGE_MONGO_ADDR_IN_USE = 'addr already in use',
  MESSAGE_MONGO_UNRECOGNISED_NOPREALLOC = 'Error parsing command line: unrecognised option \'--noprealloc\'',
  MESSAGE_MONGO_UNRECOGNISED_NOJOURNAL = 'Error parsing command line: unrecognised option \'--nojournal\'',
  MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with dbpath',

  SUCCESS_MESSAGE_MONGO_SHUTDOWN = 'The mongodb instance has been shutdown!',

  ERROR_MESSAGE_MONGO_START_FAILED = 'could not start mongo process: ',
  ERROR_MESSAGE_MONGO_SHUTDOWN = 'could not create child process to stop mongo process',
  ERROR_MESSAGE_MONGO_START_TIMEOUT = 'could not start mongo process: startup timed out',
  ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT = 'could not stop mongo process: shutdown timed out',
  ERROR_MESSAGE_MONGO_INSTANCE_EXIST = 'Is a mongod instance already running?',
  ERROR_MESSAGE_MONGO_BAD_PORT = 'The port you used is not allowed. See mongodb docs.',
  ERROR_MESSAGE_MONGO_ADDR_IN_USE  = 'The port you used is already in use.',
  ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH = 'There doesn\'t seem to be a server running with the given dbpath.';

function createErrorWithCode(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function createTimersMock() {
  const timers = new Map();
  let nextId = 1;
  let lastTimerId;

  return {
    setTimeout: jasmine.createSpy('setTimeout').and.callFake(function (callback, delay) {
      const timerId = nextId;
      nextId += 1;
      lastTimerId = timerId;
      timers.set(timerId, {callback: callback, delay: delay});
      return timerId;
    }),
    clearTimeout: jasmine.createSpy('clearTimeout').and.callFake(function (timerId) {
      timers.delete(timerId);
    }),
    runTimer: function (timerId) {
      const timer = timers.get(timerId);

      if (timer) {
        timers.delete(timerId);
        timer.callback();
      }
    },
    runLastTimer: function () {
      if (lastTimerId !== undefined) {
        this.runTimer(lastTimerId);
      }
    }
  };
}

function flushPromises() {
  return new Promise(function (resolve) {
    setImmediate(resolve);
  });
}

describe('mongoService', function () {

  let
    underTest,
    spawnResult,
    stdoutEventEmitter,
    stderrEventEmitter,
    childProcessMock,
    fsMock,
    processMock,
    state,
    timersMock;

  beforeEach(function () {
    stderrEventEmitter = new events.EventEmitter();
    stdoutEventEmitter = new events.EventEmitter();

    spawnResult = new events.EventEmitter();
    spawnResult.pid = ANY_PID;
    spawnResult.stderr = stderrEventEmitter;
    spawnResult.stdout = stdoutEventEmitter;
    spawnResult.kill = jasmine.createSpy('spawnResult.kill');

    childProcessMock = jasmine.createSpyObj('childProcess', ['spawn']);
    childProcessMock.spawn.and.returnValue(spawnResult);

    fsMock = {
      mkdirSync: jasmine.createSpy('fs.mkdirSync'),
      promises: {
        readFile: jasmine.createSpy('fs.promises.readFile').and.callFake(function () {
          return Promise.reject(createErrorWithCode('not found', 'ENOENT'));
        })
      }
    };

    processMock = jasmine.createSpyObj('process', ['kill']);
    timersMock = createTimersMock();

    state = {
      mongoProcess: undefined
    };

    underTest = createMongoService({
      childProcess: childProcessMock,
      fs: fsMock,
      process: processMock,
      state: state,
      timers: timersMock,
      timeouts: {
        startupMs: 10,
        shutdownMs: 20
      }
    });
  });

  it('should be defined', function () {
    expect(underTest).toBeDefined();
  });


  describe('start', function () {

    describe('child process execution', function () {

      it('should reject when anything throws', function (done) {
        childProcessMock.spawn.and.throwError(ANY_ERROR);

        underTest.start().then(function () {
          done.fail('reject when anything throws should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ANY_ERROR));
          done();
        });
      });

      function testStartChildProcess(test) {
        it('should call spawn on child_process with command ' + test.command, function (done) {
          underTest.start.apply(this, test.params).then(function () {
            expect(childProcessMock.spawn.calls.argsFor(0)).toEqual([test.command, test.args]);
            done();
          }).catch(function () {
            done.fail('spawn child process with command ' + test.command + ' should have been resolved');
          });

          stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
        });
      }

      [
        { params: null, command: MONGOD_COMMAND, args: []},
        { params: [ANY_BIN_PATH],
          command: path.join(ANY_BIN_PATH, MONGOD_COMMAND),
          args: [
            PARAMETER_DBPATH,
            ANY_BIN_PATH,
            PARAMETER_PIDFILE,
            ANY_PID_FILE_PATH
          ]
        },
        { params: [null, ANY_PORT], command: MONGOD_COMMAND, args: [PARAMETER_PORT, ANY_PORT]},
        { params: [null, null, true], command: MONGOD_COMMAND, args: [PARAMETER_NOPREALLOC]},
        { params: [null, null, false, true], command: MONGOD_COMMAND, args: [PARAMETER_NOJOURNAL]},
        { params: [null, null, false, false, ANY_DB_PATH],
          command: MONGOD_COMMAND,
          args: [
            PARAMETER_DBPATH,
            ANY_DB_PATH,
            PARAMETER_PIDFILE,
            ANY_DB_PID_FILE_PATH
          ]
        },
        { params: [ANY_BIN_PATH_WITH_SPECIALS, null, false, false, ANY_DB_PATH_WITH_SPECIALS],
          command: path.join(ANY_BIN_PATH_WITH_SPECIALS, MONGOD_COMMAND),
          args: [
            PARAMETER_DBPATH,
            ANY_DB_PATH_WITH_SPECIALS,
            PARAMETER_PIDFILE,
            path.join(ANY_DB_PATH_WITH_SPECIALS, 'mongod.pid')
          ]
        }
      ].forEach(testStartChildProcess);

      it('should create the dbpath before spawning mongod', function (done) {
        underTest.start(null, null, false, false, ANY_DB_PATH).then(function () {
          expect(fsMock.mkdirSync).toHaveBeenCalledWith(ANY_DB_PATH, { recursive: true });
          expect(childProcessMock.spawn).toHaveBeenCalled();
          done();
        }).catch(function () {
          done.fail('dbpath creation before startup should have been resolved');
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
      });

      it('should retry without noprealloc when mongod rejects the legacy flag', async function () {
        const promise = underTest.start(null, null, true).then(function () {
          expect(childProcessMock.spawn.calls.argsFor(0)).toEqual([MONGOD_COMMAND, [PARAMETER_NOPREALLOC]]);
          expect(childProcessMock.spawn.calls.argsFor(1)).toEqual([MONGOD_COMMAND, []]);
        });

        stderrEventEmitter.emit('data', MESSAGE_MONGO_UNRECOGNISED_NOPREALLOC);
        await flushPromises();
        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);

        await promise;
      });

      it('should retry without nojournal when mongod rejects the legacy flag', async function () {
        const promise = underTest.start(null, null, false, true).then(function () {
          expect(childProcessMock.spawn.calls.argsFor(0)).toEqual([MONGOD_COMMAND, [PARAMETER_NOJOURNAL]]);
          expect(childProcessMock.spawn.calls.argsFor(1)).toEqual([MONGOD_COMMAND, []]);
        });

        stderrEventEmitter.emit('data', MESSAGE_MONGO_UNRECOGNISED_NOJOURNAL);
        await flushPromises();
        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);

        await promise;
      });
    });

    describe('mongo process', function () {

      it('should resolve with process id if mongo has already started', function (done) {
        state.mongoProcess = {pid: ANY_PID};

        underTest.start().then(function (processID) {
          expect(processID).toEqual(ANY_PID);
          done();
        }).catch(function () {
          done.fail('resolve with process id if mongo has already started should have been resolved');
        });
      });

      it('should reject on error in mongo process', function (done) {
        const ANY_ROOT_CAUSE_MESSAGE = 'any error';

        underTest.start().then(function () {
          done.fail('reject on error in mongo process should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_FAILED + ANY_ROOT_CAUSE_MESSAGE));
          done();
        });

        stderrEventEmitter.emit('data', ANY_ROOT_CAUSE_MESSAGE);
      });

      it('should reject when startup times out', function (done) {
        underTest.start().then(function () {
          done.fail('reject when startup times out should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_START_TIMEOUT));
          expect(spawnResult.kill).toHaveBeenCalledWith('SIGTERM');
          done();
        });

        timersMock.runLastTimer();
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

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
      });

      it('should resolve with info if modern mongo process has started', function (done) {

        underTest.start().then(function (processID) {
          expect(processID).toEqual(ANY_PID);
          done();
        }).catch(function () {
          done.fail('resolve with process id if modern mongo has started should have been resolved');
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING_MODERN);
      });

      it('should clean up startup listeners after resolve', function (done) {
        underTest.start().then(function () {
          expect(stdoutEventEmitter.listenerCount('data')).toBe(0);
          expect(stderrEventEmitter.listenerCount('data')).toBe(0);
          expect(spawnResult.listenerCount('error')).toBe(0);
          expect(spawnResult.listenerCount('close')).toBe(0);
          expect(timersMock.clearTimeout).toHaveBeenCalled();
          done();
        }).catch(function () {
          done.fail('startup listener cleanup should have been resolved');
        });

        stdoutEventEmitter.emit('data', MESSAGE_MONGO_WAITING);
      });
    });
  });

  describe('stop', function () {

    describe('child process execution', function () {

      beforeEach(function () {
        state.mongoProcess = {pid: ANY_PID};
      });

      it('should reject when anything throws', function (done) {
        childProcessMock.spawn.and.throwError(ANY_ERROR);

        underTest.stop().then(function () {
          done.fail('reject when anything throws should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ANY_ERROR));
          done();
        });
      });

      it('should reject when child process creation failed', function (done) {
        childProcessMock.spawn.and.returnValue(undefined);

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

        setImmediate(function () {
          stderrEventEmitter.emit('data', MESSAGE_MONGO_UNKNOWN_DB_PATH);
        });
      });

      it('should reject when shutdown times out', function (done) {
        underTest.stop().then(function () {
          done.fail('reject when shutdown times out should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_SHUTDOWN_TIMEOUT));
          expect(spawnResult.kill).toHaveBeenCalledWith('SIGTERM');
          done();
        });

        setImmediate(function () {
          timersMock.runLastTimer();
        });
      });

      it('should resolve on shutdown', function (done) {
        underTest.stop().then(function (message) {
          expect(message).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          done();
        }).catch(function () {
          done.fail('shutdown should have been resolved');
        });

        setImmediate(function () {
          stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
        });
      });

      it('should clean up shutdown listeners after resolve', function (done) {
        underTest.stop().then(function () {
          expect(stdoutEventEmitter.listenerCount('data')).toBe(0);
          expect(stderrEventEmitter.listenerCount('data')).toBe(0);
          expect(spawnResult.listenerCount('error')).toBe(0);
          expect(spawnResult.listenerCount('close')).toBe(0);
          expect(timersMock.clearTimeout).toHaveBeenCalled();
          done();
        }).catch(function () {
          done.fail('shutdown listener cleanup should have been resolved');
        });

        setImmediate(function () {
          stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
        });
      });

      it('should stop using pid file when available', function (done) {
        fsMock.promises.readFile.and.returnValue(Promise.resolve(String(ANY_PID)));

        underTest.stop(ANY_BIN_PATH).then(function (message) {
          expect(message).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          expect(fsMock.promises.readFile).toHaveBeenCalledWith(ANY_PID_FILE_PATH, 'utf8');
          expect(processMock.kill).toHaveBeenCalledWith(ANY_PID, 'SIGTERM');
          expect(childProcessMock.spawn).not.toHaveBeenCalled();
          done();
        }).catch(function () {
          done.fail('stop using pid file when available should have been resolved');
        });
      });

      it('should fall back to mongod shutdown when pid file is missing', function (done) {
        underTest.stop(ANY_BIN_PATH).then(function (message) {
          expect(message).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          expect(fsMock.promises.readFile).toHaveBeenCalledWith(ANY_PID_FILE_PATH, 'utf8');
          expect(childProcessMock.spawn).toHaveBeenCalledWith(path.join(ANY_BIN_PATH, MONGOD_COMMAND), [
            PARAMETER_DBPATH,
            ANY_BIN_PATH,
            PARAMETER_SHUTDOWN
          ]);
          done();
        }).catch(function () {
          done.fail('fallback to mongod shutdown when pid file is missing should have been resolved');
        });

        setImmediate(function () {
          stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
        });
      });

      it('should fall back to mongod shutdown when pid file content is invalid', function (done) {
        fsMock.promises.readFile.and.returnValue(Promise.resolve('not-a-pid'));

        underTest.stop(ANY_BIN_PATH, ANY_DB_PATH).then(function (message) {
          expect(message).toEqual(SUCCESS_MESSAGE_MONGO_SHUTDOWN);
          expect(processMock.kill).not.toHaveBeenCalled();
          expect(childProcessMock.spawn).toHaveBeenCalledWith(path.join(ANY_BIN_PATH, MONGOD_COMMAND), [
            PARAMETER_DBPATH,
            ANY_DB_PATH,
            PARAMETER_SHUTDOWN
          ]);
          done();
        }).catch(function () {
          done.fail('fallback to mongod shutdown when pid file content is invalid should have been resolved');
        });

        setImmediate(function () {
          stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
        });
      });

      it('should reject unknown dbPath when pid file points to a missing process', function (done) {
        fsMock.promises.readFile.and.returnValue(Promise.resolve(String(ANY_PID)));
        processMock.kill.and.callFake(function () {
          throw createErrorWithCode('missing process', 'ESRCH');
        });

        underTest.stop(ANY_BIN_PATH).then(function () {
          done.fail('reject unknown dbPath when pid file points to a missing process should have been caught');
        }).catch(function (err) {
          expect(err).toEqual(new Error(ERROR_MESSAGE_MONGO_UNKNOWN_DB_PATH));
          done();
        });
      });

      function testStopChildProcess(test) {
        it('should call spawn on child_process with command ' + test.command, function (done) {
          underTest.stop.apply(this, test.params).then(function () {
            expect(childProcessMock.spawn.calls.argsFor(0)).toEqual([test.command, test.args]);
            done();
          }).catch(function () {
            done.fail('spawn child process with command ' + test.command + ' should have been resolved');
          });

          setImmediate(function () {
            stdoutEventEmitter.emit('data', MESSAGE_MONGO_KILLING_PROCESS);
          });
        });
      }

      [
        { params: null, command: MONGOD_COMMAND, args: [PARAMETER_SHUTDOWN]},
        { params: [ANY_BIN_PATH],
          command: path.join(ANY_BIN_PATH, MONGOD_COMMAND),
          args: [
            PARAMETER_DBPATH,
            ANY_BIN_PATH,
            PARAMETER_SHUTDOWN
          ]},
        { params: [ANY_BIN_PATH, ANY_DB_PATH],
          command: path.join(ANY_BIN_PATH, MONGOD_COMMAND),
          args: [
            PARAMETER_DBPATH,
            ANY_DB_PATH,
            PARAMETER_SHUTDOWN
          ]}
        ,
        { params: [ANY_BIN_PATH_WITH_SPECIALS, ANY_DB_PATH_WITH_SPECIALS],
          command: path.join(ANY_BIN_PATH_WITH_SPECIALS, MONGOD_COMMAND),
          args: [
            PARAMETER_DBPATH,
            ANY_DB_PATH_WITH_SPECIALS,
            PARAMETER_SHUTDOWN
          ]}
      ].forEach(testStopChildProcess);

    });
  });

});
