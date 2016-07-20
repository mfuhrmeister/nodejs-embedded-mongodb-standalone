'use strict';

var
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  jasmine = require('gulp-jasmine'),
  jasmineReporters = require('jasmine-reporters'),
  istanbul = require('gulp-istanbul'),
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
    jsFiles: [config.paths.source + '/**/*.js'],
    unit_test: config.paths.test.unit + '/**/*'
  };

gulp.task('_istanbul',function(){
  return gulp
    .src(SRC.jsFiles)
    .pipe(istanbul({
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire());
});

gulp.task('_unit',['_istanbul'], function () {
  return gulp
    .src(gutil.env.test || SRC.unit_test)
    .pipe(jasmine({
      reporter: [terminalReporter,junitReporter],
      verbose: true,
      includeStackTrace: false
    }))
    .on('error', function() { process.exit(1); } )
    .pipe(istanbul.writeReports());
});