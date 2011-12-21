###
Copyright (c) 2012 Ramesh Nair (hiddentao.com)

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
###

fs            = require 'fs'
path          = require 'path'
{print}       = require 'sys'
{spawn, exec} = require 'child_process'
rimraf        = require 'rimraf'

binpath = path.join __dirname, 'node_modules/.bin/'

stream_data_handler = (data) -> print data.toString()


compile_js = (callback) ->
    options = [
        '-c'
        '-j'
        "squel.js"
        "src/"
    ]
    coffee = spawn "#{binpath}/coffee", options
    coffee.stdout.on 'data', stream_data_handler
    coffee.stderr.on 'data', stream_data_handler
    coffee.on 'exit', (status) -> callback?() if status is 0


minify_js = (callback) ->
    options = [
        '-o'
        'squel.min.js'
        "squel.js"
    ]
    uglify = spawn "#{binpath}/uglifyjs", options
    uglify.stdout.on 'data', stream_data_handler
    uglify.stderr.on 'data', stream_data_handler
    uglify.on 'exit', (status) -> callback?() if status is 0


build_js = (callback) ->
    compile_js -> minify_js -> callback?()



build_docs = (callback) ->
    rimraf path.join(__dirname, "docs"), (err) ->
        if (err) then throw err
        options = [
            'src/squel.coffee'
        ]
        docco = spawn "#{binpath}/docco", options
        docco.stdout.on 'data', stream_data_handler
        docco.stderr.on 'data', stream_data_handler
        docco.on 'exit', (status) -> callback?() if status is 0


run_tests = (callback) ->
    options = [
        'test/expression.coffee'
        'test/select.coffee'
        'test/update.coffee'
        'test/delete.coffee'
        'test/insert.coffee'
        '--spec'
    ]
    vows = spawn "#{binpath}/vows", options
    output = ""
    data_handler = (data) ->
        output =+ data if data
        stream_data_handler data
    vows.stdout.on 'data', data_handler
    vows.stderr.on 'data', data_handler
    vows.on 'exit', (status) ->
        if 0 isnt status or (output and -1 isnt output.indexOf("✗ Broken"))
            return process.exit(1)
        callback?()


task 'docs', 'Build the documentation', ->
    build_docs -> "All done"

task 'tests', 'Run the tests', ->
    build_js -> run_tests -> "All done"

task 'build', 'Build everything', ->
    build_js -> build_docs -> "All done"