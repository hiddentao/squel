require('coffee-script/register');

const gulp = require('gulp'),
  istanbul = require('gulp-istanbul'),
  umd = require('gulp-umd'),
  path = require('path'),
  concat = require('gulp-concat'),
  insert = require('gulp-insert'),
  mocha = require('gulp-mocha'),
  babel = require('gulp-babel'),
  replace = require('gulp-replace'),
  uglify = require('gulp-uglify'),
  runSequence = require('run-sequence'),
  argv = require('yargs').argv;


const onlyTest = argv.onlyTest || argv.limitTest;


const SQUEL_VERSION = require('./package.json').version;


gulp.task('build-basic', function() {

  return gulp.src([
      './src/core.js',
    ])
    .pipe( concat('squel-basic.js') )
    .pipe( replace(/<<VERSION_STRING>>/i, SQUEL_VERSION) )
    .pipe( babel({
      presets: ['env']
    }) )
    .pipe( umd({
      exports: function (file) {
        return 'squel';
      },
      namespace: function(file) {
        return 'squel';
      }
    }))
    .pipe( gulp.dest('./dist') )
    .pipe( uglify() )
    .pipe( insert.prepend('/*! squel | https://github.com/hiddentao/squel | BSD license */') )
    .pipe( concat('squel-basic.min.js') )
    .pipe( gulp.dest('./dist') )
});


gulp.task('build-full', function() {
  return gulp.src([
      './src/core.js',
      './src/mssql.js',
      './src/mysql.js',
      './src/postgres.js',
    ])
    .pipe( concat('squel.js') )
    .pipe( replace(/<<VERSION_STRING>>/i, SQUEL_VERSION) )
    .pipe( babel({
      presets: ['env']
    }) )
    .pipe( umd({
      exports: function (file) {
        return 'squel';
      },
      namespace: function(file) {
        return 'squel';
      }
    }))
    .pipe( gulp.dest('./dist') )
    .pipe( uglify() )
    .pipe( insert.prepend('/*! squel | https://github.com/hiddentao/squel | BSD license */') )
    .pipe( concat('squel.min.js') )
    .pipe( gulp.dest('./dist') )
});


gulp.task('build', ['build-basic', 'build-full']);


gulp.task('pre-test', function () {
  return gulp.src(['dist/*.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
});


gulp.task('test', ['pre-test'], function () {
  return gulp.src(onlyTest || [
      './test/baseclasses.test.coffee',
      './test/blocks.test.coffee',
      './test/case.test.coffee',
      './test/custom.test.coffee',
      './test/delete.test.coffee',
      './test/expressions.test.coffee',
      './test/insert.test.coffee',
      './test/select.test.coffee',
      './test/update.test.coffee',
      './test/mssql.test.coffee',
      './test/mysql.test.coffee',
      './test/postgres.test.coffee',
    ], { read: false })
      .pipe(mocha({
        ui: 'exports',
        reporter: 'spec',
      }))
      .pipe(istanbul.writeReports({
        dir: './test-coverage',
      }))
      // .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }))
    ;
});



gulp.task('default', function(cb) {
  runSequence(['build'], 'test', cb);
});
