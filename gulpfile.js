require('coffee-script/register');

const gulp = require('gulp'),
  umd = require('gulp-umd'),
  path = require('path'),
  concat = require('gulp-concat'),
  insert = require('gulp-insert'),
  mocha = require('gulp-mocha'),
  babel = require('gulp-babel'),
  replace = require('gulp-replace'),
  uglify = require('gulp-uglify'),
  runSequence = require('run-sequence');


const SQUEL_VERSION = require('./package.json').version;


gulp.task('build-basic', function() {

  return gulp.src([
      './src/core.js',
    ])
    .pipe( concat('squel-basic.js') )
    .pipe( replace(/<<VERSION_STRING>>/i, SQUEL_VERSION) )
    .pipe( babel({
      presets: ['es2015']
    }) )
    .pipe( umd({
      exports: function (file) {
        return 'squel';
      },
      namespace: function(file) {
        return 'squel';
      }
    }))
    .pipe( gulp.dest('./') )
    .pipe( uglify() )
    .pipe( insert.prepend('/*! squel | https://github.com/hiddentao/squel | BSD license */') )
    .pipe( concat('squel-basic.min.js') )
    .pipe( gulp.dest('./') )
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
      presets: ['es2015']
    }) )
    .pipe( umd({
      exports: function (file) {
        return 'squel';
      },
      namespace: function(file) {
        return 'squel';
      }
    }))
    .pipe( gulp.dest('./') )
    .pipe( uglify() )
    .pipe( insert.prepend('/*! squel | https://github.com/hiddentao/squel | BSD license */') )
    .pipe( concat('squel.min.js') )
    .pipe( gulp.dest('./') )
});



gulp.task('test', function () {
  return gulp.src([
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
    ;
});


gulp.task('default', function(cb) {
  runSequence(['build-basic', 'build-full'], 'test', cb);
});



