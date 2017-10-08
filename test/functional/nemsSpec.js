'use strict';
var
  testUtil = require('../testUtil.js'),
  originalTimeout,

  ANY_VERSION = '3.2.8',
  ANY_DOWNLOAD_PATH_WITH_SPACE = 'test folder',
  ANY_DB_PATH_WITH_SPACE = 'test folder',

  PID;

xdescribe('nems', function () {

  var
    underTest;

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;
    testUtil.createFolder(ANY_DOWNLOAD_PATH_WITH_SPACE);

    underTest = require('../../lib/nems.js');
  });

  afterEach(function () {
    testUtil.killProcess(PID);
    testUtil.deleteFolder(ANY_DOWNLOAD_PATH_WITH_SPACE);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  describe('start', function () {
    it('should start a mongo with a space in the path to the bin folder', function (done) {
      underTest.start(ANY_VERSION, ANY_DOWNLOAD_PATH_WITH_SPACE, undefined, undefined, undefined, ANY_DB_PATH_WITH_SPACE)
        .then(function (pid) {
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
