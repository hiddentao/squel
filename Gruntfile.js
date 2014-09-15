'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  var SQUEL_VERSION = require('./package.json').version;

  grunt.initConfig({
    clean: {
      build: ['squel.js', 'squel.min.js'],
      docs: 'docs'
    },
    coffee: {
      build_basic: {
        files: [{
          src: 'src/squel.coffee',
          dest: './squel-basic.js'
        }]
      },
      build_full: {
        options: {
          join: true
        },
        files: [{
          src: ['src/squel.coffee', 'src/postgres.coffee', 'src/mysql.coffee', 'src/mssql.coffee'],
          dest: './squel.js'
        }]
      }
    },
    replace: {
      squel: {
        src: ['./squel-basic.js', './squel.js'],
        overwrite: true,
        replacements: [{
          from: '<<VERSION_STRING>>',
          to: SQUEL_VERSION
        }]
      }
    },
    uglify: {
      build_basic: {
        options: {
          banner: '/*! squel | https://github.com/hiddentao/squel | BSD license */'
        },
        files: {
          './squel-basic.min.js': [ './squel-basic.js' ]
        }
      },
      build_full: {
        options: {
          banner: '/*! squel | https://github.com/hiddentao/squel | BSD license */'
        },
        files: {
          './squel.min.js': [ './squel.js' ]
        }
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          ui: 'exports',
          require: 'coffee-script'
        },
        src: ['test/baseclasses.test.coffee',
        'test/blocks.test.coffee',
        'test/custom.test.coffee',
        'test/delete.test.coffee',
        'test/expressions.test.coffee',
        'test/insert.test.coffee',
        'test/mocha.test.coffee',
        'test/selet.test.coffee',
        'test/testbase.test.coffee',
        'test/update.test.coffee'
        ]
      },
      test_mysql: {
        options: {
          reporter: 'spec',
          ui: 'exports',
          require: 'coffee-script'
        },
        src: ['test/mysql.test.coffee']
      },
      test_mssql: {
        options: {
          reporter: 'spec',
          ui: 'exports',
          require: 'coffee-script'
        },
        src: ['test/mssql.test.coffee']
      },
      test_postgres: {
        options: {
          reporter: 'spec',
          ui: 'exports',
          require: 'coffee-script'
        },
        src: ['test/postgres.test.coffee']
      }
    }
  });


  grunt.registerTask('build', [
    'clean',
    'coffee',
    'replace',
    'uglify',
    'mochaTest'
  ]);

  grunt.registerTask('default', [
    'build'
  ]);
};
