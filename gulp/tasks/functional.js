'use strict';

const
  gulp = require('gulp'),
  config = require('../config'),
  runJasmine = require('../support/runJasmine');

gulp.task('_functional', function () {
  return runJasmine(config.paths.test.functional, config.paths.reports + '/functional');
});
