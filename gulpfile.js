var gulp = require('gulp');
var config = require('./gulp.config')();
var $ = require('gulp-load-plugins')({ lazy: true });
var del = require('del');


// Default (Help Task)
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);


// Tasks
gulp.task('prompt', ['clean'], buildPrompt);
gulp.task('build', ['prompt', 'templates', 'interpolateTemplates', 'interpolateLess']);
gulp.task('clean', cleanTask);
gulp.task('templates', ['prompt'], templatesTask);
gulp.task('interpolateTemplates', ['templates'], interpolateTemplatesTask);
gulp.task('interpolateLess', ['templates'], interpolateLessTask);


// Vars
var params;


// ----------------------------------------------------------------------------------------------------


// Before we start the build process, prompt the user to provide some input
function buildPrompt() {
	return gulp.src(config.root)
		.pipe($.prompt.prompt(config.prompt.inputs, saveResponse));
	
	function saveResponse(response) {
		if (response.type[0] === 'desktop (default)') {
			response.type[0] = 'default';
		}
		
		response.date = dateString();
		
		params = response;
	}
}


// Clean out the build directory before we start another build process
function cleanTask() {
	return del(config.build);
}


// Put HTML Templates into the build directory
function templatesTask() {
	return gulp.src(config.source + params.type + '/' + config.acceptedTypes)
        .pipe(gulp.dest(config.build + '/' + params.type));
}


// Interpolate input data into the HTML template files
function interpolateTemplatesTask() {
	var src = gulp.src(config.build + '/' + params.type + '/' + config.templates);
	
	return interpolate(src).pipe(gulp.dest(config.build + '/' + params.type));
}


// Interpolate input data into the LESS files (compiler and config)
function interpolateLessTask() {
	var src = gulp.src([
		config.build + '/' + params.type + '/css/less/compiler.less',
		config.build + '/' + params.type + '/css/less/config.less'
	]);
	
	return interpolate(src).pipe(gulp.dest(config.build + '/' + params.type + '/css/less/'));
}


// ----------------------------------------------------------------------------------------------------


// Return the current month and year in a readable, string format
function dateString() {
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var date = new Date();
	
	return months[date.getMonth()] + ' ' + date.getFullYear();
}


// Interpolate our 'params' data into a file stream
function interpolate(src) {
	return src
		.pipe($.replace(/\{\{SITE\}\}/g, params.site))
		.pipe($.replace(/\{\{TITLE\}\}/g, params.title))
		.pipe($.replace(/\{\{AUTHOR\}\}/g, params.author))
		.pipe($.replace(/\{\{DATE\}\}/g, params.date));
}