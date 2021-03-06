const gulp = require('gulp')
const loadPlugins = require('gulp-load-plugins')
const del = require('del')
const glob = require('glob')
const path = require('path')
// const isparta = require('isparta')
const webpack = require('webpack')
const webpackStream = require('webpack-stream')

// const Instrumenter = isparta.Instrumenter
// const mochaGlobals = require('./test/setup/.globals');
const manifest = require('./package.json')

// Load all of our Gulp plugins
const $ = loadPlugins()

// Gather the library data from `package.json`
const config = manifest.babelBoilerplateOptions
const mainFile = manifest.main
const destinationFolder = path.dirname(mainFile)
const exportFileName = path.basename(mainFile, path.extname(mainFile))

function cleanDist (done) {
  del([destinationFolder]).then(() => done())
}

function cleanTmp (done) {
  del(['tmp']).then(() => done())
}

// Lint a set of files
function lint (files) {
  return gulp.src(files)
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
}

function lintSrc () {
  return lint('src/**/*.js')
}

function lintTest () {
  return lint('test/**/*.js')
}

function lintGulpfile () {
  return lint('gulpfile.js')
}

function build () {
  return gulp.src(path.join('src', config.entryFileName))
    .pipe(webpackStream({
      output: {
        filename: `${exportFileName}.js`,
        libraryTarget: 'umd',
        library: config.mainVarName
      },
      externals: {
        'standard-settings': {
          amd: 'standard-settings',
          root: 'standardSettings',
          commonjs: 'standard-settings',
          commonjs2: 'standard-settings'
        },
        'signals': {
          amd: 'signals',
          root: 'signals',
          commonjs: 'signals',
          commonjs2: 'signals'
        },
        'socket.io-client': {
          amd: 'socket.io-client',
          root: 'io',
          commonjs: 'socket.io-client',
          commonjs2: 'socket.io-client'
        },
        'socketio-wildcard': {
          amd: 'socketio-wildcard',
          root: 'socketioWildcard',
          commonjs: 'socketio-wildcard',
          commonjs2: 'socketio-wildcard'
        }
      },
      module: {
        rules: [
          {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
        ]
      },
      devtool: 'source-map',
      node: {
        console: true,
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
      }
    }, webpack))
    .pipe(gulp.dest(destinationFolder))
    .pipe($.filter(['**', '!**/*.js.map']))
    .pipe($.rename(`${exportFileName}.min.js`))
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($.uglify())
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(destinationFolder))
}

// function _mocha() {
//   return gulp.src(['test/setup/node.js', 'test/unit/**/*.js'], {read: false})
//     .pipe($.mocha({
//       reporter: 'dot',
//       globals: Object.keys(mochaGlobals.globals),
//       ignoreLeaks: false
//     }));
// }

function _registerBabel () {
  require('babel-register')
}

function test () {
  _registerBabel()
  // return _mocha();
}

const watchFiles = ['src/**/*', 'test/**/*', 'package.json', '**/.eslintrc']

// Run the headless unit tests as you make changes.
function watch () {
  gulp.watch(watchFiles, ['test'])
}

function testBrowser () {
  // Our testing bundle is made up of our unit tests, which
  // should individually load up pieces of our application.
  // We also include the browser setup file.
  const testFiles = glob.sync('./test/unit/**/*.js')
  const allFiles = ['./test/setup/browser.js'].concat(testFiles)

  // Lets us differentiate between the first build and subsequent builds
  var firstBuild = true

  // This empty stream might seem like a hack, but we need to specify all of our files through
  // the `entry` option of webpack. Otherwise, it ignores whatever file(s) are placed in here.
  return gulp.src('')
    .pipe($.plumber())
    .pipe(webpackStream({
      watch: true,
      entry: allFiles,
      output: {
        filename: '__spec-build.js'
      },
      // Externals isn't necessary here since these are for tests.
      module: {
        loaders: [
          // This is what allows us to author in future JavaScript
          {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
          // This allows the test setup scripts to load `package.json`
          {test: /\.json$/, exclude: /node_modules/, loader: 'json-loader'}
        ]
      },
      plugins: [
        // By default, webpack does `n=>n` compilation with entry files. This concatenates
        // them into a single chunk.
        new webpack.optimize.LimitChunkCountPlugin({maxChunks: 1})
      ],
      devtool: 'inline-source-map',
      node: {
        console: true,
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
      }
    }, null, () => {
      if (firstBuild) {
        $.livereload.listen({port: 35729, host: 'localhost', start: true})
        gulp.watch(watchFiles, ['lint'])
      } else {
        $.livereload.reload('./tmp/__spec-build.js')
      }
      firstBuild = false
    }))
    .pipe(gulp.dest('./tmp'))
}

// Remove the built files
gulp.task('clean', cleanDist)

// Remove our temporary files
gulp.task('clean-tmp', cleanTmp)

// Lint our source code
gulp.task('lint-src', lintSrc)

// Lint our test code
gulp.task('lint-test', lintTest)

// Lint this file
gulp.task('lint-gulpfile', lintGulpfile)

// Lint everything
gulp.task('lint', gulp.parallel('lint-src', 'lint-test', 'lint-gulpfile'))

// Build two versions of the library
// gulp.task('build', ['lint', 'clean'], build)
gulp.task('build',
  gulp.series('lint', 'clean', build))

// Lint and run our tests
gulp.task('test', gulp.parallel('lint'), test)

// Set up a livereload environment for our spec runner `test/runner.html`
gulp.task('test-browser', gulp.series('lint', 'clean-tmp', testBrowser))

// Run the headless unit tests as you make changes.
gulp.task('watch', watch)

// An alias of test
gulp.task('default', gulp.series('test'))
