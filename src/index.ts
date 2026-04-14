import squel from "./core"
import "./mysql"
import "./postgres"
import "./mssql"

export default squel
export { squel }
export type {
  BaseBuilder,
  Case,
  Cloneable,
  Delete,
  Expression,
  Flavour,
  FormattingOptions,
  Insert,
  ParamString,
  QueryBuilder,
  QueryBuilderOptions,
  Select,
  Squel,
  ToParamOptions,
  Update,
  ValueHandler,
} from "./types"
