var
  gulp = require('gulp'),
  config = require('../config'),

  SRC = {
    jsFiles: [config.paths.source + '/**/*.js'],
    unit_test: config.paths.test.unit + '/**/*'
  };

gulp.task('_watch', function () {
  return gulp
    .watch(
    [SRC.jsFiles, SRC.unit_test],
    ['_lint', '_unit']
  );
});