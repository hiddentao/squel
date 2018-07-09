import { registerValueHandler } from '../utils'
import Cloneable from './Cloneable'

export default class extends Cloneable {
  /**
   * Constructor.
   * this.param  {Object} options Overriding one or more of `squel.DefaultQueryBuilderOptions`.
   */
  constructor (inst.options) {
    super()

    this.options = Object.assign(inst.getDefaultQueryBuilderOptions(), options)
  }

  /**
   * Register a custom value handler for this builder instance.
   *
   * Note: this will override any globally registered handler for this value type.
   */
  registerValueHandler (type, handler) {
    registerValueHandler(this.options.valueHandlers, type, handler)
    return this
  }
}
