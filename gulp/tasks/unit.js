'use strict';

var
  gulp = require('gulp'),
  jasmine = require('gulp-jasmine'),
  jasmineReporters = require('jasmine-reporters'),
  config = require('../config'),

  junitReporterOptions = {
    consolidate: true,
    consolidateAll: false,
    savePath: config.paths.reports + '/unit',
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
    unit_test: config.paths.test.unit + '/**/*'
  };

gulp.task('_unit', function () {
  return gulp
    .src(SRC.unit_test)
    .pipe(jasmine({
      reporter: [terminalReporter,junitReporter],
      verbose: true,
      includeStackTrace: false
    }))
    .on('error', function() { process.exit(1); } );
});
