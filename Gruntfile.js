module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),

    uglify: {
      options: {
        banner: '/*! jquery.peer <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>). @michelle */\n'
      },
      build: {
        src: './lib/jquery.peer.js',
        dest: './jquery.peer.min.js'
      }
    },

    concat: {
      options: {
        banner: '/*! jquery.peer <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>). @michelle */\n'
      },
      dist: {
        src: ['./lib/jquery.peer.js'],
        dest: './jquery.peer.js',
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['uglify', 'concat']);
};
