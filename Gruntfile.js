'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

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
          src: ['src/squel.coffee', 'src/postgres.coffee'],
          dest: './squel.js'
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
        src: ['test/*.test.coffee']
      }
    },
    shell: {
      docs: {
        command: 'docco src/*.coffee'
      }
    }
  });



  grunt.registerTask('test', [
    'clean:build',
    'coffee',
    'mochaTest'
  ]);

  grunt.registerTask('build', [
    'clean',
    'coffee',
    'mochaTest',
    'uglify',
    'shell:docs'
  ]);

  grunt.registerTask('default', [
    'build'
  ]);
};
