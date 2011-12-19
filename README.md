# squel - an SQL query builder for Javascript

A simple, well tested SQL query string builder for Javascript.

## Features

* Supports the construction of all standard DML queries: SELECT, INSERT and UPDATE queries.
* Full documented.
* Comprehensive unit tests (using vows).
* Written in CoffeeScript for ease of maintainability.
* Available as a node.js package.

## How to use

Install using [npm](http://npmjs.org/):

    $ npm install squel

## Documentation

Full documentation is available inside the `docs/` folder. To build the documentation yourself you will first need to
have the latest dev version of [pygment](http://pygments.org/download/) installed in your Python environment. Then
do the following inside the project folder:

    $ npm install
    $ node_modules/.bin/cake docs

## Testing

Tests are found in the `test/` folder and are run using vows:

    $ npm install
    $ node_modules/.bin/cake tests

If you wish to submit a pull request please update and/or create new tests for any changes you make and ensure all the
tests pass.

---

Source: [github](https://github.com/hiddentao/squel)


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





