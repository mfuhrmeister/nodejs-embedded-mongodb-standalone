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

  junitReporter = new jasmineReporters.JUnitXmlReporter(junitReporterOptions),

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


gulp.task('_unit',["_istanbul"], function () {
  return gulp
    .src(gutil.env.test || SRC.unit_test)
    .pipe(jasmine({
      reporter: junitReporter,
      verbose: true,
      includeStackTrace: true
    }))
    .pipe(istanbul.writeReports());
});