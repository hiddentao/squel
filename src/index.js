import buildSquel from './core'

const squel = buildSquel()

squel.flavours = {}

squel.useFlavour = flavour => {
  if (!flavour) {
    return squel
  }

  if (squel.flavours[flavour] instanceof Function) {
    let s = buildSquel(flavour)

    squel.flavours[flavour](s)

    // add in flavour methods
    s.flavours = squel.flavours
    s.useFlavour = squel.useFlavour

    return s
  }
  else {
    throw new Error(`Flavour not available: ${flavour}`)
  }
}

export default squel
