'use strict';
var
  gulp = require('gulp'),
  requireDir = require('require-dir');


requireDir('./gulp/tasks', {
  recurse: true
});

gulp.task('clean', gulp.series('_clean'));

gulp.task('lint', gulp.series('_lint'));

gulp.task('unit', gulp.series('_unit'));

gulp.task('functional', gulp.series('_functional'));

gulp.task('build', gulp.series('_clean', '_lint', '_unit', '_functional'));

gulp.task('test', gulp.series('_lint', '_unit', '_functional'));

gulp.task('default', gulp.series('_watch'));
