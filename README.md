# kSQL - SQL query builder for Javascript

A simple, well tested SQL query string builder for Javascript.

## Features

* Supports the construction of all standard DML queries: SELECT, INSERT and UPDATE queries.
* Full documented.
* Comprehensive unit tests (using vows).
* Written in CoffeeScript for ease of maintainability.
* Available as a node.js package.

## How to use

Install using [npm](http://npmjs.org/):

    $ npm install ksql

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

Developed by [Ramesh Nair](http://www.hiddentao.com/).


