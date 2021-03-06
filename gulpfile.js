'use strict';


const gulp = require('gulp-param')(require('gulp'), process.argv);
const config = require('./gulp.config')();
const $ = require('gulp-load-plugins')({ lazy: true });
const del = require('del');


// Default (Help Task)
gulp.task('help', $.taskListing);
gulp.task('default', ['help']);


// Tasks
gulp.task('prompt', ['clean'], buildPrompt);
gulp.task('build', ['prompt', 'templates', 'interpolateTemplates', 'interpolateLess', 'inject']);
gulp.task('clean', cleanTask);
gulp.task('templates', ['prompt'], templatesTask);
gulp.task('interpolateTemplates', ['templates'], interpolateTemplatesTask);
gulp.task('interpolateLess', ['templates'], interpolateLessTask);
gulp.task('inject', ['interpolateTemplates'], injectTask);


// Vars
let params;
let workingBuildPath;


// ----------------------------------------------------------------------------------------------------


// Before we start the build process, prompt the user to provide some input
function buildPrompt(desktop, mobile, responsive) {
    // Set the type of project files to generate
    let type;
    
    if (desktop) {
        type = 'default';
    } else if (mobile) {
        type = 'mobile';
    } else if (responsive) {
        type = 'responsive';
    } else {
        // Instead of dealing with error handling, just output a message and cancel the task
        console.log('Error: Please specify a project type:');
        console.log('usage: gulp build [--desktop]');
        console.log('                     [--mobile]');
        console.log('                     [--responsive]');
        
        // Cancel
        return;
    }
    
    return gulp.src(config.root)
        .pipe($.prompt.prompt(config.prompt.inputs, response => {
             // Go through each response property (they're either a string or array)
             // ...if string, find matching key and replace with corresponding value
             // ...if array,     loop through list, find matching key and replace with corresponding value
             for (let prop in response) {
                 if (response.hasOwnProperty(prop)) {
                     let value = response[prop];
                     
                     if (Array.isArray(value)) {
                         const len = value.length;
                         
                         for (let i = 0; i < len; i++) {
                             response[prop][i] = getMappedParam(value[i]);
                         }
                     } else {
                         response[prop] = getMappedParam(value);
                     }
                 }
             }
             
             response.date = dateString();
             response.type = type;
             
             params = response;
             workingBuildPath = `${config.build}/${params.type}`;
        }));
}


// Clean out the build directory before we start another build process
function cleanTask() {
    return del(config.build);
}


// Inject dependencies into the HTML template files
function injectTask() {
    const src = gulp.src(`${workingBuildPath}/${config.templates}`);
    
    // Inject styles
    src.pipe($.inject(
        gulp.src(`${workingBuildPath}/${config.styles}`, { read: false }),
        config.inject.options
    ));
    
    // Inject the required "common" script for sites using the LESS framework
    params.libs.unshift(`${config.publicScripts}less/less.common.min.js`);
    
    // Inject public script libraries (if selected) and local scripts (if available)
    params.libs.push(`${config.src}${params.type}/${config.scripts}`);
    
    src.pipe($.inject(
        gulp.src(params.libs, { read: false }),
        config.inject.options
    ));
    
    return src.pipe(gulp.dest(workingBuildPath));
}


// Interpolate input data into the HTML template files
function interpolateTemplatesTask() {
    const src = gulp.src(`${workingBuildPath}/${config.templates}`);
    
    return interpolate(src)
        .pipe(gulp.dest(workingBuildPath));
}


// Interpolate input data into the LESS files (compiler and config)
function interpolateLessTask() {
    const src = gulp.src([
        `${workingBuildPath}/css/less/compiler.less`,
        `${workingBuildPath}/css/less/config.less`
    ]);
    
    return interpolate(src)
        .pipe(gulp.dest(`${workingBuildPath}/css/less/`));
}


// Put HTML Templates into the build directory
function templatesTask() {
    return gulp.src(`${config.src}${params.type}/${config.acceptedTypes}`)
        .pipe(gulp.dest(workingBuildPath));
}




// ----------------------------------------------------------------------------------------------------




// Return the current month and year in a readable, string format
function dateString() {
    const date = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}


// Return the param value from the 'inputsMap' in the config file or return the original 'param' if no match is found
// This allows us to manage checkboxes with different labels and values.
function getMappedParam(param) {
    const value = config.prompt.inputsMap[param];
    
    return value === undefined ? param : value;
}


// Interpolate our 'params' data into a file stream
function interpolate(src) {
    return src
        .pipe($.replace(/\{\{VERSION\}\}/g, config.version))
        .pipe($.replace(/\{\{SITE\}\}/g, params.site))
        .pipe($.replace(/\{\{TITLE\}\}/g, params.title))
        .pipe($.replace(/\{\{AUTHOR\}\}/g, params.author))
        .pipe($.replace(/\{\{DATE\}\}/g, params.date));
}