# Changelog for [squel](https://github.com/hiddentao/squel)

## 17 May 2017 (5.10.0)
* #317 - Postgres `ON CONFLICT` improvements, thanks [alexturek](https://github.com/alexturek)

## 21 Apr 2017 (5.9.1)
* Performance improvements (#309, #310) - thanks [schmod](https://github.com/schmod)

## 13 Apr 2017 (5.9.0)
* Enable custom value handlers to return values that do not get automatically nested - #292

## 28 Feb 2017 (5.8.0)
* #301 - Add `rstr()` to enable "raw" nesting of query builders
* Renamed `_isSquelBuilder()` call to `isSquelBuilder()`

## 6 Feb 2017 (5.7.0)
* #288 - more flexible `RETURNING` clauses

## 7 Jan 2017 (5.6.0)
* #256 - expression nesting

## 24 Dec 2016 (5.5.1)
* #255, #283 - mixing flavours

## 15 Oct 2016 (5.5.0)
* #118 - pass extra formatting options (when available) to custom value handler
* #273 - parameterized `LIMIT` and `OFFSET` queries

## 15 Sep 2016 (5.4.3)
* #266 - Postgres `ON CONFLICT` support

## 27 Aug 2016 (5.4.2)
* A better check for detecting when custom value formatting has been applied.
* Allow for any builder to passed in as an expression

## 26 Aug 2016 (5.3.4)
* #261 - passing a string for `order` clause

## 12 Jul 2016 (5.3.3)
* #249 - Postgres `DISTINCT ON` clause

## 13 Jun 2016 (5.3.2)
* #234 - Fix handling of expression field names

## 5 Jun 2016 (5.3.1)
* #158, #239 - Support for CTE queries (`WITH` clause)
* #242 - Fix auto-quoting table names
* Removed bower.json

## 18 May 2016 (5.2.1)
* Re-fix for #109 - custom string formatting wasn't quite working

## 18 May 2016 (5.2.0)
* Fix for #109 - custom string formatting function enabled
* Fix for #235 - fix a regression

## 14 May 2016 (5.1.0)
* Fix for #231 - try not to add extra brackets
* Fix for #233 - ability to specify target table in `DELETE` queries

## 17 Apr 2016 (5.0.4)
* Fix for #227 - MSSQL insert without fields fails

## 13 Apr 2016 (5.0.3)
* Fix for #225 - auto-quote field names had stopped working

## 11 Apr 2016 (5.0.2)
* Fix for #226 - empty expressions in where clause

## 6 Apr 2016 (5.0.1)
* Fix for #223 - array looping should not use `for-in`

## 29 Mar 2016 (5.0.0)
* Complete architectural rewrite - see #201

## 23 Mar 2016 (4.4.2)
* Fix for #220 and #221 and other similar issues

## 20 Mar 2016 (4.4.1)
* Fixed for #219

## 19 Mar 2016 (4.4.0)
* Ported coffeescript to ES6

## 29 Feb 2016 (4.3.3)
* Fix for #216

## 24 Feb 2016 (4.3.2)
* Fix for #210

## 18 Feb 2016 (4.3.1)
* #208 - Rework expressions to allow for easier cloning.

## 18 Feb 2016 (4.3.0)
* #207 - Added `CASE` clauses and `useAsForTableAliasNames` option.

## 17 Feb 2016 (4.2.4)
* #199 - Added `FROM` to `UPDATE` for postgres flavour

## 20 Jan 2016 (4.2.3)
* Placeholder parameter character is now configurable
* Guide docs now print results below code
* Re-instituted CHANGELOG.md
* Can now get current flavour of Squel using `flavour` prop

## 13 Nov 2015 (4.2.2)
* Merged #191

## 30 Aug 2014 (3.8.1)
* #90 - custom value handlers with primitives
* #87 - OrderBlock not compatible by values

## 11 Aug 2014 (3.7.0)
* #76 - MSSQL flavour
* #85 - Using expressions in .where() followed by .toParam()

## 30 July 2014 (3.6.1)
* Better fix for #82
* Treat `*` as a special case when auto-quoting field names
* Fix for #84

## 19 July 2014 (3.5.0)
* #82 - `ON DUPLIATE KEY UPDATE` enchancements
* #25, #72, #73 - parameter substitution in expressions
* #79 - smarter automatic fieldname quoting
* #75 - disable automatic string quoting on a per-field basis
* #55 - specify sub-query as a field
* #80, #81 - Bugfixes

## 17 May 2014 (3.4.1)
* #62 - can specify query separator string

## 15 May 2014 (3.3.0)
* Shifted `replaceSingleQuotes` and related option into Squel core.

## 9 May 2014 (3.2.0)
* Added DELETE..RETURNING for Postgres (#60)
* Auto-generate version string (#61)
* Don't commit docs/ folder anymore. Also don't auto-build docs as part of build.

## 21 Mar 2014 (3.1.1)
* Don't format parameter values returned from the toParam() call, unless their custom value types (#54)

## 20 Mar 2014 (3.0.1)
* Added `setFields` and `setFieldRows` to make setting multple fields and inserting multiple rows easier (#50)
* Removed `usingValuePlaceholders` option that was deprecated in 2.0.0

## 16 Dec 2013 (2.0.0)
* Added `RETURNING` clause to `UPDATE` queries for Postgres flavour (#42)
* Added better support for parameterized queries (#34)
* Added `squel.VERSION` constant


## 7 Oct 2013 (1.2.1)
* Added ON DUPLICATE KEY UPDATE clause for MySQL flavour (#36)
* Added single quote replacement option for Postgres flavour (#35)


## 2 Oct 2013 (1.2)
* Switched from Make to Grunt
* Added `fields()` method to SELECT builder (#29)
* Expression trees can now be cloned (#31)
* Added concept of SQL 'flavours' and merged in the Postgres `RETURNING` command #33


## 10 Jun 2013 (1.1.3)
* Table names in SELECT queries can now be queries themselves (i.e. SQL sub statements)


## 2 Jun 2013 (1.1.2)
* Parameterised WHERE clauses now supported.
* Custom value types can now be handled in a special way. Global and per-instance handlers supported.


## 27 Mar 2013 (1.1)
* Squel can now be customized to include proprietary commands and queries.
* AMD support added.


## 4 Jan 2013 (1.0.6)
* Squel can now be told to auto-quote table and field names.


## 3 Nov 2012 (1.0.5)

* DELETE queries can now contain JOINs
* Query builder instances can be clone()'d
* Cleaner and more thorough tests (and replaced Vows with Mocha, Sinon and Chai)
* Fixed documentation errors


## 17 Aug 2012 (1.0.4)

* QueryBuilder base class for all query builders
* Exporting query builders
* Escaping strings with single quotes for PostgreSQL compatibility
* Migrating to make


## 27 Jan 2012 (1.0.3)

* Added 'usingValuePlaceholders' option for INSERT and UPDATE query builders.


## 20 Dec 2011 (1.0.0)

* Initial version.
