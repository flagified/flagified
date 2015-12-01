module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    wiredep: {
      target: {
        src: './index.html',
        fileTypes: {
          html: {
            block: /(([ \t]*)<!--\s*bower:*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endbower\s*-->)/gi,
            detect: {
              js: /<script.*src=['"]([^'"]+)/gi,
              css: /<link.*href=['"]([^'"]+)/gi
            },
            replace: {
              js: '<script src="/{{filePath}}"></script>',
              css: '<link rel="stylesheet" href="/{{filePath}}" />'
            }
          }
        }
      },
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: './public/assets/js/main.js',
        dest: './public/assets/js/main.min.js'
      },
    },
    concat: {
      options: {
        separator: ';',
      },
      js_frontend: {
        src: [
          './components/jquery/dist/jquery.js',
          './components/smartcrop/smartcrop.js',
          './components/jquery-ui/jquery-ui.js',
          './components/bootstrap/dist/js/bootstrap.js',
          './assets/js/main.js'
        ],
        dest: './public/assets/js/main.js',
      },
    },
    sass: {
      dist: {
        options: {
          style: 'expanded'
        },
        files: {
          './public/assets/stylesheets/main.css': './assets/stylesheets/main.scss'
        }
      }
    },
    watch: {
      css: {
        files: '**/*.s[ac]ss',
        tasks: ['sass'],
        options: {
          livereload: true,
        },
      },
      html: {
        files: '**/*.html',
        options: {
          livereload: true,
        }
      },
      js: {
        files: './assets/js/*.js',
        tasks: ['concat', 'uglify'],
        options: {
          livereload: true,
        }
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify', 'sass']);
};
