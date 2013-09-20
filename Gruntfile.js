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
      build: {
        files: [{
          src: 'src/*.coffee',
          dest: './squel.js'
        }]
      }
    },
    uglify: {
      build: {
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
    'mochaTest'
  ]);

  grunt.registerTask('build', [
    'clean',
    'coffee:build',
    'uglify:build',
    'shell:docs'
  ]);

  grunt.registerTask('default', [
    'test',
    'build'
  ]);
};
