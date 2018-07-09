export default class {
  /**
   * Clone this builder
   */
  clone () {
    return _extend(new this.constructor, _clone(_extend({}, this)))
  }
}
