'use strict';

var
  gulp = require('gulp'),
  path = require('path'),
  nsp = require('gulp-nsp');

gulp.task('_nsp', function (cb) {
  return nsp({package: path.resolve('package.json')}, cb);
});