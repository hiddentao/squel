var squel = require('./squel');

var query2 = squel.select({autoQuoteTableNames:true, nameQuoteCharacter:'"'})
    .from("test01", "t01")
    .where("t01.delete_flg = '0'")
    .toString();

console.log(query2);