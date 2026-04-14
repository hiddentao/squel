# squel &mdash; SQL query string builder

[![CI](https://github.com/hiddentao/squel/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/hiddentao/squel/actions/workflows/ci.yml?query=branch%3Amaster)
[![Coverage Status](https://coveralls.io/repos/github/hiddentao/squel/badge.svg?branch=master)](https://coveralls.io/github/hiddentao/squel?branch=master)
[![npm version](https://badge.fury.io/js/squel.svg)](https://www.npmjs.com/package/squel)
[![NPM downloads](https://img.shields.io/npm/dm/squel.svg)](https://www.npmjs.com/package/squel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A flexible and powerful SQL query string builder for JavaScript and TypeScript.

Full guide and API documentation at [https://hiddentao.github.io/squel](https://hiddentao.github.io/squel).

## Features

- Written in TypeScript with first-class type definitions.
- Works in Node.js and the browser.
- Supports the standard SQL queries: `SELECT`, `UPDATE`, `INSERT`, `DELETE`.
- Supports non-standard commands for MySQL, PostgreSQL, and Microsoft SQL Server.
- Supports parameterized queries for safe value escaping.
- Extensible &mdash; build any custom query or command you need.
- Fluent method-chaining API.
- Ships as dual ESM + CommonJS with a minified IIFE bundle for CDN use.

> **Warning:** Do not ever pass queries generated on the client side to your web server for execution. Such a configuration would make it trivial for a casual attacker to execute arbitrary queries &mdash; as with an SQL-injection vector, but much easier to exploit and practically impossible to protect against.

Squel is suitable for production use. If you want richer ORM features you may also want to consider [Knex](https://knexjs.org/).

## Installation

```bash
# npm
npm install squel

# bun
bun add squel

# yarn
yarn add squel

# pnpm
pnpm add squel
```

Squel requires Node.js 18 or newer.

## Usage

### ESM / TypeScript

```typescript
import squel from "squel"

const query = squel.select().from("books").field("title").toString()
```

### CommonJS

```javascript
const squel = require("squel").default
// or: const { squel } = require("squel")

const query = squel.select().from("books").field("title").toString()
```

### Browser (CDN)

```html
<script src="https://unpkg.com/squel/dist/browser/squel.min.js"></script>
<script>
  // `squel` is available on the global scope
  const query = squel.select().from("books").field("title").toString()
</script>
```

## Package layout

The published package contains:

- `dist/esm/` &mdash; ES module build (`import squel from "squel"`).
- `dist/cjs/` &mdash; CommonJS build (`require("squel")`).
- `dist/types/` &mdash; TypeScript declaration files.
- `dist/browser/squel.min.js` &mdash; minified IIFE bundle for `<script>` tags (exposes `window.squel`).

## Examples

### SELECT

```javascript
// SELECT * FROM table
squel.select()
    .from("table")
    .toString()

// SELECT t1.id, t2.name FROM table `t1` LEFT JOIN table2 `t2` ON (t1.id = t2.id) WHERE (t2.name <> 'Mark') AND (t2.name <> 'John') GROUP BY t1.id
squel.select()
    .from("table", "t1")
    .field("t1.id")
    .field("t2.name")
    .left_join("table2", "t2", "t1.id = t2.id")
    .group("t1.id")
    .where("t2.name <> 'Mark'")
    .where("t2.name <> 'John'")
    .toString()

// SELECT `t1`.`id`, `t1`.`name` as "My name", `t1`.`started` as "Date" FROM table `t1` WHERE age IN (RANGE(1, 1.2)) ORDER BY id ASC LIMIT 20
squel.select({ autoQuoteFieldNames: true })
    .from("table", "t1")
    .field("t1.id")
    .field("t1.name", "My name")
    .field("t1.started", "Date")
    .where("age IN ?", squel.str('RANGE(?, ?)', 1, 1.2))
    .order("id")
    .limit(20)
    .toString()
```

You can build parameterized queries:

```javascript
/*
{
    text: "SELECT `t1`.`id`, `t1`.`name` as \"My name\", `t1`.`started` as \"Date\" FROM table `t1` WHERE age IN (RANGE(?, ?)) ORDER BY id ASC LIMIT 20",
    values: [1, 1.2]
}
*/
squel.select({ autoQuoteFieldNames: true })
    .from("table", "t1")
    .field("t1.id")
    .field("t1.name", "My name")
    .field("t1.started", "Date")
    .where("age IN ?", squel.str('RANGE(?, ?)', 1, 1.2))
    .order("id")
    .limit(20)
    .toParam()
```

You can use nested queries:

```javascript
// SELECT s.id FROM (SELECT * FROM students) `s` INNER JOIN (SELECT id FROM marks) `m` ON (m.id = s.id)
squel.select()
    .from(squel.select().from("students"), "s")
    .field("id")
    .join(squel.select().from("marks").field("id"), "m", "m.id = s.id")
    .toString()
```

### UPDATE

```javascript
// UPDATE test SET f1 = 1
squel.update()
    .table("test")
    .set("f1", 1)
    .toString()

// UPDATE test, test2, test3 AS `a` SET test.id = 1, test2.val = 1.2, a.name = "Ram", a.email = NULL, a.count = a.count + 1
squel.update()
    .table("test")
    .set("test.id", 1)
    .table("test2")
    .set("test2.val", 1.2)
    .table("test3", "a")
    .setFields({
        "a.name": "Ram",
        "a.email": null,
        "a.count = a.count + 1": undefined,
    })
    .toString()
```

### INSERT

```javascript
// INSERT INTO test (f1, f2) VALUES (1, 1.2)
squel.insert()
    .into("test")
    .set("f1", 1)
    .set("f2", 1.2)
    .toString()
```

### DELETE

```javascript
// DELETE FROM test WHERE (f1 = 2) ORDER BY f2 LIMIT 1
squel.delete()
    .from("test")
    .where("f1 = 2")
    .order("f2")
    .limit(1)
    .toString()
```

### Expression builder

```javascript
// test = 3 OR test = 4
squel.expr()
    .or("test = 3")
    .or("test = 4")
    .toString()

// test = 3 AND (inner = 1 OR inner = 2) OR (inner = 3 AND inner = 4 OR (inner IN ('str1, 'str2', NULL)))
squel.expr()
    .and("test = 3")
    .and(
        squel.expr()
            .or("inner = 1")
            .or("inner = 2")
    )
    .or(
        squel.expr()
            .and("inner = ?", 3)
            .and("inner = ?", 4)
            .or(
                squel.expr()
                    .and("inner IN ?", ["str1", "str2", null])
            )
    )
    .toString()

// SELECT * FROM test INNER JOIN test2 ON (test.id = test2.id) WHERE (test = 3 OR test = 4)
squel.select()
    .join("test2", null, squel.expr().and("test.id = test2.id"))
    .where(squel.expr().or("test = 3").or("test = 4"))
    .toString()
```

### Custom value types

By default Squel does not support the use of object instances as field values. Instead it lets you tell it how you want specific object types to be handled:

```javascript
// handler for objects of type Date
squel.registerValueHandler(Date, (date) => {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
})

squel.update()
    .table("students")
    .set("start_date", new Date(2013, 5, 1))
    .toString()

// UPDATE students SET start_date = '2013/6/1'
```

Custom value handlers can also be overridden on a per-instance basis (see the [docs](https://hiddentao.github.io/squel)).

### Custom queries

Squel lets you extend the built-in query builders or create entirely new kinds of queries:

```javascript
class CommandBlock extends squel.cls.Block {
    command(command, arg) {
        this._command = command
        this._arg = arg
    }
    compress(level) {
        this.command("compress", level)
    }
    _toParamString(options) {
        let text = this._command.toUpperCase()
        const values = []
        if (options.buildParameterized) {
            text += " ?"
            values.push(this._arg)
        } else {
            text += ` ${this._arg}`
        }
        return { text, values }
    }
}

class PragmaQuery extends squel.cls.QueryBuilder {
    constructor(options) {
        super(options, [
            new squel.cls.StringBlock(options, "PRAGMA"),
            new CommandBlock(options),
        ])
    }
}

squel.pragma = (options) => new PragmaQuery(options)

squel.pragma().compress(9).toString()
// 'PRAGMA COMPRESS 9'

squel.pragma().compress(9).toParam()
// { text: 'PRAGMA COMPRESS ?', values: [9] }
```

## Non-standard SQL flavours

Squel supports the standard SQL commands and reserved words. A number of database engines provide their own non-standard commands; Squel makes it easy to load different "flavours" of SQL that augment the core builders with engine-specific features.

Available flavours: `mysql`, `mssql`, `postgres` (e.g. `INSERT ... RETURNING` for Postgres, `ON DUPLICATE KEY UPDATE` for MySQL).

```javascript
import squel from "squel"

const pg = squel.useFlavour("postgres")
const mysql = squel.useFlavour("mysql")
const mssql = squel.useFlavour("mssql")
```

For browser use:

```html
<script src="https://unpkg.com/squel/dist/browser/squel.min.js"></script>
<script>
  const pg = squel.useFlavour("postgres")
</script>
```

See the [API docs](http://hiddentao.github.io/squel/api.html) for a full reference.

## Migrating from v5

v6.0.0 is a modernization release. The public API is unchanged &mdash; all your existing `squel.select()`, `squel.useFlavour('postgres')`, and related calls continue to work.

The breaking changes are all about **package shape**:

- **Engines:** `engines.node` is now `>=18`. If you need support for older runtimes, stay on v5.
- **Output layout:** the `squel.js` / `squel.min.js` / `squel-basic.js` / `squel-basic.min.js` UMD bundles have been replaced. Consumers now import from `dist/esm/`, `dist/cjs/`, or the IIFE at `dist/browser/squel.min.js` (see the [Package layout](#package-layout) section).
- **No separate "basic" bundle.** The main entry point includes all flavours. ESM users benefit from tree-shaking; script-tag users get the single IIFE.
- **UMD dropped.** If you loaded `squel.min.js` via `<script>`, switch to `dist/browser/squel.min.js` (same global `window.squel`).

## Development

```bash
bun install          # install dependencies
bun run check        # lint & format check (biome)
bun run typecheck    # TypeScript type checking
bun test             # run the test suite
bun run build        # produce dist/esm, dist/cjs, dist/types, dist/browser
```

## Releasing

Releases are automated. Landing a conventional commit on `master` triggers the release workflow, which bumps the version, updates `CHANGELOG.md`, creates a tag, and publishes to npm with provenance. See [`RELEASE.md`](RELEASE.md) for details.

## Contributing

Contributions are welcome! Please see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Ports to other languages

- .NET &mdash; https://github.com/seymourpoler/Squel.net
- Crystal &mdash; https://github.com/seymourpoler/Squel.crystal

## License

MIT &mdash; see [`LICENSE.md`](LICENSE.md).
