'use strict'

const CACHE = process.argv[3]

const getTTL = (s = 3600) => (typeof CACHE !== 'undefined' ? s : undefined)

module.exports = {
  getTTL
}
