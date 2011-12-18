
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
  var kSqlExpression,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  kSqlExpression = (function() {
    var _toString;

    kSqlExpression.prototype.tree = null;

    kSqlExpression.prototype.current = null;

    function kSqlExpression() {
      this.toString = __bind(this.toString, this);
      this.or = __bind(this.or, this);
      this.and = __bind(this.and, this);
      this.end = __bind(this.end, this);
      this.begin = __bind(this.begin, this);      this.tree = {
        type: 'group',
        parent: null,
        nodes: []
      };
      this.current = this.tree;
    }

    kSqlExpression.prototype.begin = function() {
      var new_tree;
      new_tree = {
        type: 'group',
        parent: this.current,
        nodes: []
      };
      this.current.nodes.push(new_tree);
      this.current = this.current.nodes[this.current.nodes.length - 1];
      return this;
    };

    kSqlExpression.prototype.end = function() {
      if (!(this.current.parent != null)) {
        throw new Error("begin() needs to be called");
      }
      this.current = this.current.parent;
      return this;
    };

    kSqlExpression.prototype.and = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'AND',
        expr: expr
      });
      return this;
    };

    kSqlExpression.prototype.or = function(expr) {
      if (!expr || "string" !== typeof expr) {
        throw new Error("expr must be a string");
      }
      this.current.nodes.push({
        type: 'OR',
        expr: expr
      });
      return this;
    };

    kSqlExpression.prototype.toString = function() {
      if (null !== this.current.parent) throw new Error("end() needs to called");
      return _toString(this.tree);
    };

    _toString = function(node) {
      var child, childStr, str, _i, _len, _ref;
      str = "";
      _ref = node.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        switch (child.type) {
          case "AND":
          case "OR":
            if ("" !== str) str += " " + child.type + " ";
            str += child.expr;
            break;
          default:
            childStr = _toString(child);
            if ("" !== childStr) str += "(" + childStr + ")";
        }
      }
      return str;
    };

    return kSqlExpression;

  })();

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {
      expression: kSqlExpression
    };
  }

}).call(this);
