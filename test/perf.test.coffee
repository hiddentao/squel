###
Copyright (c) 2016 Ramesh Nair (hiddentao.com)

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


Benchmark = require 'benchmark'
knex = require('knex')({
  client: 'sqlite3',
  useNullAsDefault: true
})
  
squel = require "../dist/squel-basic"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()

###
Should compare with immediate previous version of squel. Either same or 
better performance required.

OR

Compare against knex.
###


analyze = (benchmark, done) ->
  console.log "#{benchmark[0].name}: #{benchmark[0].stats.mean}"
  console.log "#{benchmark[1].name}: #{benchmark[1].stats.mean}"
  
  if benchmark.filter('fastest').map('name') isnt 'squel'
    done(new Error('Knex was faster'))
  else
    done()


test['select query'] =
  basic: (done) ->
    suite = new Benchmark.Suite
    
    suite.add 'squel', ->
      squel.select().from('students').toString()
    
    suite.add 'knex', ->
      knex('students').select().toString()
      
    suite.on 'complete', ->
      analyze(this, done);
      
    suite.run()



module?.exports[require('path').basename(__filename)] = test
