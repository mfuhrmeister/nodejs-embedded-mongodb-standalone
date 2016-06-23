/*jshint strict:false*/
var config = require('../config'),
    jshint = require('gulp-jshint'),
    gulp   = require('gulp');

var
  SRC = {
    jsFiles: [config.paths.source + '/**/*.js', config.paths.test.base + '/**/*.js']
  };

gulp.task('_lint', function() {
  gulp
    .src(SRC.jsFiles)
    .pipe(jshint({
      strict: 'global',
      node: true
    }))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});
