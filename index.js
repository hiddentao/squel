class A {
  constructor () {
    if (!this.constructor.test) {
      this.constructor.test = 'A'
    } else {
      this.constructor.test = 'B'
    }
  }

  getIt () {
    return this.constructor.test
  }
}

const a = new A()
console.log(a.getIt())
const b = new A()
console.log(b.getIt())
