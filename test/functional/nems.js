'use strict';
var
  testUtil = require('../testUtil.js'),
  originalTimeout,

  ANY_VERSION = '3.2.8',
  ANY_DB_PATH_WITH_SPACE = 'test folder',

  PID;

describe('nems', function () {

  var
    underTest;

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
    testUtil.createFolder(ANY_DB_PATH_WITH_SPACE);

    underTest = require('../../lib/nems.js');
  });

  afterEach(function () {
    testUtil.killProcess(PID, true);
    testUtil.deleteFolder(ANY_DB_PATH_WITH_SPACE);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  describe('start', function () {
    it('should start a mongo with a space in the path to the bin folder', function (done) {
      underTest.start(ANY_VERSION, ANY_DB_PATH_WITH_SPACE).then(function (pid) {
        expect(pid).toBeDefined();
        PID = pid;
        done();
      }).catch(function (err) {
        console.log(err);
        done.fail('start with a space in the path to the bin folder should have been resolved');
      });
    });
  });
});
