# squel - SQL query string builder

[![Build Status](https://secure.travis-ci.org/hiddentao/squel.png)](http://travis-ci.org/hiddentao/squel) [![NPM module](https://badge.fury.io/js/squel.png)](https://badge.fury.io/js/squel)

A flexible and powerful SQL query string builder for Javascript.

## Features

* Works in node.js and in the browser.
* Supports the standard SQL queries: SELECT, UPDATE, INSERT and DELETE.
* Can be customized to support non-standard queries.
* Uses method chaining for ease of use.
* Well tested (~240 tests).
* Small: ~4 KB minified and gzipped

## Installation

### node.js

Install using [npm](http://npmjs.org/):

    $ npm install squel

### Browser

Use [bower](https://github.com/bower/bower) if you like:

    $ bower install squel

Or add the following inside your HTML:

    <script type="text/javascript" src="https://rawgithub.com/hiddentao/squel/master/squel.min.js"></script>

**NOTE: It is recommended that you do NOT create queries browser-side to run on the server as this massively increases
your exposure to [SQL Injection](http://en.wikipedia.org/wiki/SQL_injection) attacks.**

## Examples

Before running the examples ensure you have `squel` installed and enabled at the top of your script:

    var squel = require("squel");

**SELECT**

    // SELECT * FROM table
    squel.select()
        .from("table")
        .toString()

    // SELECT t1.id, t1.name as "My name", t1.started as "Date" FROM table `t1` ORDER BY id ASC LIMIT 20
    squel.select()
        .from("table", "t1")
        .field("t1.id")
        .field("t1.name", "My name")
        .field("t1.started", "Date")
        .order("id")
        .limit(20)
        .toString()

    // SELECT t1.id, t2.name FROM table `t1` LEFT JOIN table2 `t2` ON (t1.id = t2.id) WHERE (t2.name <> 'Mark') AND (t2.name <> 'John') GROUP BY t1.id HAVING (AVG(t2.score) >= '5') AND (COUNT(t2.apples) > '42')
    squel.select()
        .from("table", "t1")
        .field("t1.id")
        .field("t2.name")
        .left_join("table2", "t2", "t1.id = t2.id")
        .group("t1.id")
        .where("t2.name <> 'Mark'")
        .where("t2.name <> 'John'")
        .having("AVG(t2.score) >= ?", 5)
        .having("COUNT(t2.apples) >= ?", 42)
        .toString()

You can use nested queries too:

    // SELECT s.id FROM (SELECT * FROM students) `s` INNER JOIN (SELECT id FROM marks) `m` ON (m.id = s.id)
    squel.select()
        .from( squel.select().from('students'), 's' )
        .field('id')
        .join( squel.select().from('marks').field('id'), 'm', 'm.id = s.id' )
        .toString()


**UPDATE**

    // UPDATE test SET f1 = 1
    squel.update()
        .table("test")
        .set("f1", 1)
        .toString()

    // UPDATE test, test2, test3 AS `a` SET test.id = 1, test2.val = 1.2, a.name = "Ram", a.email = NULL
    squel.update()
        .table("test")
        .set("test.id", 1)
        .table("test2")
        .set("test2.val", 1.2)
        .table("test3","a")
        .set("a.name", "Ram")
        .set("a.email", null)
        .toString()

**INSERT**

    // INSERT INTO test (f1) VALUES (1)
    squel.insert()
        .into("test")
        .set("f1", 1)
        .toString()

    // INSERT INTO test (f1, f2, f3, f4, f5) VALUES (1, 1.2, TRUE, "blah", NULL)
    squel.insert()
        .into("test")
        .set("f1", 1)
        .set("f2", 1.2)
        .set("f3", true)
        .set("f4", "blah")
        .set("f5", null)
        .toString()

**DELETE**

    // DELETE FROM test
    squel.delete()
        .from("test")
        .toString()

    // DELETE FROM table1 WHERE (table1.id = 2) ORDER BY id DESC LIMIT 2
    squel.delete()
        .from("table1")
        .where("table1.id = ?", 2)
        .order("id", false)
        .limit(2)

**Expression builder**

There is also an expression builder which allows you to build complex expressions for `WHERE` and `ON` clauses:

    // test = 3 OR test = 4
    squel.expr()
        .or("test = 3")
        .or("test = 4")
        .toString()

    // test = 3 AND (inner = 1 OR inner = 2) OR (inner = 3 AND inner = 4 OR (inner = 5))
    squel.expr()
        .and("test = 3")
        .and_begin()
            .or("inner = 1")
            .or("inner = 2")
        .end()
        .or_begin()
            .and("inner = 3")
            .and("inner = 4")
            .or_begin()
                .and("inner = 5")
            .end()
        .end()
        .toString()

    // SELECT * FROM test INNER JOIN test2 ON (test.id = test2.id) WHERE (test = 3 OR test = 4)
    squel.select()
        .join( "test2", null, squel.expr().and("test.id = test2.id") )
        .where( squel.expr().or("test = 3").or("test = 4") )

**Custom value types**

By default Squel does not support the use of object instances as field values. Instead it lets you tell it how you want
specific object types to be handled:

    // handler for objects of type Date
    squel.registerValueHandler(Date, function(date) {
      return date.getFullYear() + '/' + date.getMonth() + '/' + date.getDate();
    });

    squel.update().
      .table('students')
      .set('start_date', new Date(2013, 5, 1))
      .toString()

    // UPDATE students SET start_date = '2013/5/1'


_Note that custom value handlers can be overridden on a per-instance basis (see the [docs](http://squeljs.org/))_

**Custom queries**

Squel allows you to override the built-in query builders with your own as well as create your own types of queries:

    // ------------------------------------------------------
    // Setup the PRAGMA query builder
    // ------------------------------------------------------
    var util = require('util');   // to use util.inherits() from node.js

    var CommandBlock = function() {};
    util.inherits(CommandBlock, squel.cls.Block);

    // private method - will not get exposed within the query builder
    CommandBlock.prototype._command = function(_command) {
      this._command = _command;
    }

    // public method - will get exposed within the query builder
    CommandBlock.prototype.compress = function() {
      this._command('compress');
    };

    CommandBlock.prototype.buildStr = function() {
      return this._command.toUpperCase();
    };


    // generic parameter block
    var ParamBlock = function() {};
    util.inherits(ParamBlock, squel.cls.Block);

    ParamBlock.prototype.param = function(p) {
      this._p = p;
    };

    ParamBlock.prototype.buildStr = function() {
      return this._p;
    };


    // pragma query builder
    var PragmaQuery = function(options) {
      squel.cls.QueryBuilder.call(this, options, [
          new squel.cls.StringBlock(options, 'PRAGMA'),
          new CommandBlock(),
          new ParamBlock()
      ]);
    };
    util.inherits(PragmaQuery, squel.cls.QueryBuilder);


    // convenience method (we can override built-in squel methods this way too)
    squel.pragma = function(options) {
      return new PragmaQuery(options)
    };


    // ------------------------------------------------------
    // Build a PRAGMA query
    // ------------------------------------------------------

    squel.pragma()
      .compress()
      .param('test')
      .toString();

    // 'PRAGMA COMPRESS test'


## Documentation

Full API documentation is available at [http://squeljs.org/](http://squeljs.org/).

Annotated source code can be found in the `docs/` folder. This is built using
[docco](http://jashkenas.github.com/docco/). To build it yourself you will first need to have the latest dev version
of [pygment](http://pygments.org/download/) installed in your local Python environment. Then do the following inside
the project folder:

    $ npm install
    $ make docs

## Testing

Tests are written in [Mocha](http://visionmedia.github.com/mocha/) and can be found in the `test/` folder. To run them do the following:

    $ npm install
    $ make test


## Contributing

If you wish to submit a pull request please update and/or create new tests for any changes you make and ensure all the
tests pass.

---

Homepage: [http://squeljs.org](http://squeljs.org/)
Source: [https://github.com/hiddentao/squel](https://github.com/hiddentao/squel)


Copyright (c) 2012 [Ramesh Nair](http://www.hiddentao.com/)

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





