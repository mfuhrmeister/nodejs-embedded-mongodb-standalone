'use strict';
const
  gulp = require('gulp');

require('./gulp/tasks/clean');
require('./gulp/tasks/functional');
require('./gulp/tasks/lint');
require('./gulp/tasks/release');
require('./gulp/tasks/unit');
require('./gulp/tasks/watch');

gulp.task('clean', gulp.series('_clean'));

gulp.task('lint', gulp.series('_lint'));

gulp.task('unit', gulp.series('_unit'));

gulp.task('functional', gulp.series('_functional'));

gulp.task('build', gulp.series('_clean', '_lint', '_unit', '_functional'));

gulp.task('test', gulp.series('_lint', '_unit', '_functional'));

gulp.task('default', gulp.series('_watch'));
