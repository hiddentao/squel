// This file contains additional Squel commands for use with MySQL

squel.flavours['mysql'] = function(_squel) {
  let cls = _squel.cls;

  // target <table> in DELETE <table> FROM ...
  cls.TargetTableBlock = class extends cls.AbstractValueBlock {
    target (table) {
      this._setValue( this._sanitizeTable(table) );
    }
  }


  // ON DUPLICATE KEY UPDATE ...
  cls.MysqlOnDuplicateKeyUpdateBlock = class extends cls.AbstractSetFieldBlock {
    onDupUpdate (field, value, options) {
      this._set(field, value, options);
    }

    buildStr () {
      let str = "";

      for (let i in this.fields) {
        let field = this.fields[i];
        
        if (str.length) {
          str += ", ";
        }

        let value = this.values[0][i];

        let fieldOptions = this.fieldOptions[0][i];

        // e.g. if field is an expression such as: count = count + 1
        if (typeof value === 'undefined') {
          str += field;
        }
        else {
          str += `${field} = ${this._formatValue(value, fieldOptions)}`;
        }
      }

      return !str.length ? "" : `ON DUPLICATE KEY UPDATE ${str}`;
    }

    buildParam (queryBuilder) {
      let str = "",
        vals = [];

      for (let i in this.fields) {
        let field = this.fields[i];

        if (str.length) {
          str += ", ";
        }

        let value = this.values[0][i];

        let fieldOptions = this.fieldOptions[0][i];

        // e.g. if field is an expression such as: count = count + 1
        if (typeof value === 'undefined') {
          str += field;
        }
        else {
          str += `${field} = ${this.options.parameterCharacter}`;
          vals.push(this._formatValueAsParam(value));
        }
      }

      return {
        text: !str.length ? "" : `ON DUPLICATE KEY UPDATE ${str}`,
        values: vals,
      };
    }
  }


  // INSERT query builder.
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.MysqlOnDuplicateKeyUpdateBlock(options),
      ];

      super(options, blocks);
    }
  }

  cls.Delete = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'DELETE'),
        new cls.TargetTableBlock(options),
        new cls.FromTableBlock( _extend({}, options, { singleTable: true }) ),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ];

      super(options, blocks);
    }
  }
};

