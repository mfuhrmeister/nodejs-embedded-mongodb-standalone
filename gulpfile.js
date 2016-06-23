'use strict';
var
  gulp = require('gulp'),
  path = require('path'),
  sequence = require('run-sequence'),
  requireDir = require('require-dir');


requireDir('./gulp/tasks', {
  recurse: true
});

gulp.task('clean',function (done) {
  sequence(
    '_clean',
    done
  );
});

gulp.task('lint',function (done) {
  sequence(
    '_lint',
    done
  );
});

gulp.task('unit',function (done) {
  sequence(
    '_unit',
    done
  );
});

gulp.task('build',function(done) {
  sequence(
    '_clean',
    '_nsp',
    '_lint',
    '_unit',
    done
  );
});

gulp.task('test', function(done) {
  sequence(
    '_lint',
    '_unit',
    done
  );
});

gulp.task('default', ['_watch']);