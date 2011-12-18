fs            = require 'fs'
{print}       = require 'sys'
{spawn, exec} = require 'child_process'

binpath = 'node_modules/.bin/'

stream_data_handler = (data) -> print data.toString()


build_js = (callback) ->
    options = [
        '-c'
        '-j'
        "ksql.js"
        "src/"
    ]
    coffee = spawn "#{binpath}/coffee", options
    coffee.stdout.on 'data', stream_data_handler
    coffee.stderr.on 'data', stream_data_handler
    coffee.on 'exit', (status) -> callback?() if status is 0


build_docs = (callback) ->
    options = [
        'src/ksql.coffee'
    ]
    docco = spawn "#{binpath}/docco", options
    docco.stdout.on 'data', stream_data_handler
    docco.stderr.on 'data', stream_data_handler
    docco.on 'exit', (status) -> callback?() if status is 0


run_tests = (callback) ->
    options = [
        'test/expression.coffee'
        '--spec'
    ]
    vows = spawn "#{binpath}/vows", options
    vows.stdout.on 'data', stream_data_handler
    vows.stderr.on 'data', stream_data_handler
    vows.on 'exit', (status) -> callback?() if status is 0



task 'docs', 'Build the documentation', ->
    build_docs -> "All done"

task 'tests', 'Run the tests', ->
    build_js -> run_tests -> "All done"

task 'build', 'Build the project', ->
    build_js -> build_docs -> "All done"