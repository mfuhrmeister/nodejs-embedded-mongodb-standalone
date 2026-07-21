'use strict';

var
  gulp = require('gulp'),
  config = require('../config'),
  runJasmine = require('../support/runJasmine');

gulp.task('_unit', function () {
  return runJasmine(config.paths.test.unit, config.paths.reports + '/unit');
});
