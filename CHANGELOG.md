# Changelog for [squel](https://github.com/hiddentao/squel)

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

