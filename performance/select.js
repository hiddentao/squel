const Benchmark = require('benchmark')
const knex = require('knex')({ client: 'mysql' })
const squel = require('../')

const suite = new Benchmark.Suite()

// add tests
suite
  .add('Knex', function() {
    knex.select('title', 'author', 'year').from('books').toString()
  })
  .add('Squel', function() {
    squel.select().fields(['title', 'author', 'year']).from('books').toString()
  })
  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ 'async': false });
