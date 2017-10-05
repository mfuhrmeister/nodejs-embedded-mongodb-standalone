'use strict';

var
  gulp = require('gulp'),
  jasmine = require('gulp-jasmine'),
  jasmineReporters = require('jasmine-reporters'),
  config = require('../config'),

  junitReporterOptions = {
    consolidate: true,
    consolidateAll: false,
    savePath: config.paths.reports + '/functional',
    filePrefix: 'TEST-',
    useDotNotation: true
  },
  terminalReporterOptions = {
    verbosity: 3,
    color: 'yellow'
  },

  junitReporter = new jasmineReporters.JUnitXmlReporter(junitReporterOptions),
  terminalReporter = new jasmineReporters.TerminalReporter(terminalReporterOptions),

  SRC = {
    functional_test: config.paths.test.functional + '/**/*'
  };

gulp.task('_functional', function () {
  return gulp
    .src(SRC.functional_test)
    .pipe(jasmine({
      reporter: [terminalReporter,junitReporter],
      verbose: true,
      includeStackTrace: false
    }))
    .on('error', function() { process.exit(1); } );
});