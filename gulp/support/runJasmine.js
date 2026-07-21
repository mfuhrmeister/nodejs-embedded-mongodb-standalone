'use strict';

var
  Jasmine = require('jasmine'),
  jasmineReporters = require('jasmine-reporters');

function createTerminalReporter() {
  return new jasmineReporters.TerminalReporter({
    verbosity: 3,
    color: 'yellow'
  });
}

function createJunitReporter(reportDir) {
  return new jasmineReporters.JUnitXmlReporter({
    consolidate: true,
    consolidateAll: false,
    savePath: reportDir,
    filePrefix: 'TEST-',
    useDotNotation: true
  });
}

function runJasmine(specDir, reportDir) {
  var runner = new Jasmine();

  runner.exitOnCompletion = false;
  runner.env.configure({
    random: false,
    stopSpecOnExpectationFailure: false
  });
  runner.loadConfig({
    spec_dir: specDir,
    spec_files: ['**/*Spec.js'],
    helpers: []
  });

  runner.env.clearReporters();
  runner.addReporter(createTerminalReporter());
  runner.addReporter(createJunitReporter(reportDir));

  return runner.execute().then(function (passed) {
    if (!passed) {
      throw new Error('Jasmine failed');
    }
  });
}

module.exports = runJasmine;
