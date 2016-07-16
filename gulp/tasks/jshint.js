'use strict';

/*jshint strict:false*/
var
  jshint = require('gulp-jshint'),
  gulp   = require('gulp'),
  mapStream = require('map-stream'),
  config = require('../config');

var
  SRC = {
    jsFiles: [config.paths.source + '/**/*.js', config.paths.test.base + '/**/*.js', config.paths.gulp + '/**/*.js' ]
  };

var exitOnJshintError = mapStream(function (file, cb) {
  if (!file.jshint.success) {
    process.exit(1);
  } else {
    cb();
  }
});

gulp.task('_lint', function() {
  return gulp
    .src(SRC.jsFiles)
    .pipe(jshint({
      strict: 'global',
      node: true
    }))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(exitOnJshintError);
});
