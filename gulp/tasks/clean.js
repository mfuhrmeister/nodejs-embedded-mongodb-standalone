'use strict';

var
  gulp = require('gulp'),
  loadDel = Function('specifier', 'return import(specifier);');

gulp.task('_clean', function () {
  return loadDel('del').then(function (delModule) {
    return delModule.deleteAsync(['./target']);
  });
});
