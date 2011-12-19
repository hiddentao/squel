
/*
Copyright (c) 2012 Ramesh Nair (hiddentao)

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
*/

(function() {
  var Expression, Select, sanitizeAlias, sanitizeCondition, sanitizeField, sanitizeTable,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Expression = (function() {
    var _toString;

    Expression.prototype.tree = null;

    Expression.prototype.current = null;

    function Expression() {
      this.toString = __bind(this.toString, this);
      this.or = __bind(this.or, this);
      this.and = __bind(this.and, this);
      this.end = __bind(this.end, this);
      this.or_begin = __bind(this.or_begin, this);
      this.and_begin = __bind(this.and_begin, this);
      var _this = this;
      this.tree = {
        parent: null,
        nodes: []
      };
      this.current = this.tree;
      this._begin = function(op) {
        var new_tree;
        new_tree = {
          type: op,
          parent: _this.current,
          nodes: []
        };
        _this.current.nodes.push(new_tree);
        _this.current = _this.current.nodes[_this.current.nodes.length - 1];
        return _this;
      };
    }

    Expression.prototype.and_begin = function() {
      return this._begin('AND');
    };

    Expression.prototype.or_begin = function() {
      return this._begin('OR');
    };

    Expression.prototype.end = function() {
      if (!this.current.parent) throw new Error("begin() needs to be called");
      this.current = this.current.parent;
      return this;
    };

    Expression.prototype.and = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'AND',
        expr: expr
      });
      return this;
    };

    Expression.prototype.or = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'OR',
        expr: expr
      });
      return this;
    };

    Expression.prototype.toString = function() {
      if (null !== this.current.parent) {
        throw new Error("end() needs to be called");
      }
      return _toString(this.tree);
    };

    _toString = function(node) {
      var child, nodeStr, str, _i, _len, _ref;
      str = "";
      _ref = node.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        if (child.expr != null) {
          nodeStr = child.expr;
        } else {
          nodeStr = _toString(child);
          if ("" !== nodeStr) nodeStr = "(" + nodeStr + ")";
        }
        if ("" !== nodeStr) {
          if ("" !== str) str += " " + child.type + " ";
          str += nodeStr;
        }
      }
      return str;
    };

    return Expression;

  })();

  sanitizeAlias = function(alias) {
    if (alias && "string" !== typeof alias) {
      throw new Error("alias must be a string");
    }
    return alias;
  };

  sanitizeCondition = function(condition) {
    if ("Expression" !== typeof condition || "string" !== typeof condition) {
      throw new Error("condition must be a string or Expression instance");
    }
    if ("Expression" === typeof condition) condition = condition.toString();
    return condition;
  };

  sanitizeTable = function(table) {
    if ("string" !== typeof table) throw new Error("table name must be a string");
    return table;
  };

  sanitizeField = function(field) {
    if ("string" !== typeof field) throw new Error("field must be a string");
    return field;
  };

  Select = (function() {

    Select.prototype.tables = null;

    Select.prototype.fields = null;

    Select.prototype.joins = null;

    Select.prototype.wheres = null;

    function Select() {
      this.toString = __bind(this.toString, this);
      this.where = __bind(this.where, this);
      this.outer_join = __bind(this.outer_join, this);
      this.right_join = __bind(this.right_join, this);
      this.left_join = __bind(this.left_join, this);
      this.join = __bind(this.join, this);
      this.field = __bind(this.field, this);
      this.from = __bind(this.from, this);
      var _this = this;
      this.tables = [];
      this.fields = [];
      this.joins = [];
      this.wheres = [];
      this.join = function(type, table, alias, condition) {
        table = sanitizeTable(table);
        if (alias) alias = sanitizeAlias(alias);
        if (condition) condition = sanitizeCondition(condition);
        _this.joins.push({
          type: type,
          table: table,
          alias: alias,
          condition: condition
        });
        return _this;
      };
    }

    Select.prototype.from = function(table, alias) {
      if (alias == null) alias = null;
      table = sanitizeTable(table);
      if (alias) alias = sanitizeAlias(alias);
      this.tables.push({
        name: table,
        alias: alias
      });
      return this;
    };

    Select.prototype.field = function(field, alias) {
      if (alias == null) alias = null;
      field = sanitizeField(field);
      if (alias) alias = sanitizeAlias(alias);
      this.fields.push({
        field: field,
        alias: alias
      });
      return this;
    };

    Select.prototype.join = function(table, alias, condition) {
      if (alias == null) alias = null;
      if (condition == null) condition = null;
      return this.join('INNER', table, alias, condition);
    };

    Select.prototype.left_join = function(table, alias, condition) {
      if (alias == null) alias = null;
      if (condition == null) condition = null;
      return this.join('LEFT', table, alias, condition);
    };

    Select.prototype.right_join = function(table, alias, condition) {
      if (alias == null) alias = null;
      if (condition == null) condition = null;
      return this.join('RIGHT', table, alias, condition);
    };

    Select.prototype.outer_join = function(table, alias, condition) {
      if (alias == null) alias = null;
      if (condition == null) condition = null;
      return this.join('OUTER', table, alias, condition);
    };

    Select.prototype.where = function(condition) {
      condition = sanitizeCondition(condition);
      this.wheres.push(condition);
      return this;
    };

    Select.prototype.toString = function() {
      return "";
    };

    return Select;

  })();

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {
      expr: function() {
        return new Expression;
      },
      select: function() {
        return new Select;
      },
      update: function() {
        return new Update;
      },
      insert: function() {
        return new Insert;
      },
      "delete": function() {
        return new Delete;
      }
    };
  }

}).call(this);
