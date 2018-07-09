import {
  defaultQueryBuilderOptions,
  isSquelBuilder,
  shouldApplyNesting,
  registerValueHandler
} from './utils'





export default (flavour = null) => {
  const ret = {}

  // default query builder options
  ret.getDefaultQueryBuilderOptions = defaultQueryBuilderOptions

  // global value handlers
  ret.globalValueHandlers = []

  // Register a new value handler
  cls.registerValueHandler = (type, handler) => {
    registerValueHandler(ret.globalValueHandlers, type, handler);
  }

  // Base class for cloneable builders
  cls.Cloneable = class {
    /**
     * Clone this builder
     */
    clone () {
      let newInstance = new this.constructor;

      return _extend(newInstance, _clone(_extend({}, this)));
    }
  }


}
