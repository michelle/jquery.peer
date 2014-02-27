module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),

    uglify: {
      build: {
        src: './lib/jquery.peer.js',
        dest: './jquery.peer.min.js'
      }
    },

    concat: {
      options: {
        separator: ';',
        banner: '/*! jquery.peer <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>). @michelle */\n'
      },
      // Not minified!
      dist: {
        src: ['./lib/jquery.peer.js', './bower_components/peerjs/peer.js'],
        dest: './jquery.peer.js',
      },
      minified: {
        src: ['./jquery.peer.min.js', './bower_components/peerjs/peer.min.js'],
        dest: './jquery.peer.min.js',
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['uglify', 'concat']);
};
