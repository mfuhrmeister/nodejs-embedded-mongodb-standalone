var
  gulp = require('gulp'),
  del = require('del');

gulp.task('_clean', function (done) {
  return del(['./target'], done);
});