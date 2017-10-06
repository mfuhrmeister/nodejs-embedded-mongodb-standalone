'use strict';
var
  gulp = require('gulp'),
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

gulp.task('functional',function (done) {
  sequence(
    '_functional',
    done
  );
});

gulp.task('build',function(done) {
  sequence(
    '_clean',
    '_nsp',
    '_lint',
    '_unit',
    '_functional',
    done
  );
});

gulp.task('test', function(done) {
  sequence(
    '_lint',
    '_unit',
    '_functional',
    gracefulShutdownFn(done)
  );
});

gulp.task('default', ['_watch']);


function gracefulShutdownFn(done) {
  return function() {
    setTimeout(function() {
      console.log('graceful shutdown');
      process.kill(process.pid, 'SIGKILL');
    }, 1000);
    done();
  };
}