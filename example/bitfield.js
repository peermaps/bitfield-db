var Bitfield = require('../')
var raf = require('random-access-file')
var bf = new Bitfield(raf('/tmp/bitfield.db'))

;[5,10,15,20,23,24,26,27].forEach(x => bf.add(x))

bf.flush(function (err) {
  if (err) return console.error(err)
  bf.rank(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`rank(24) = ${res}`)
  })
  bf.select(5, function (err, res) {
    if (err) console.error(err)
    else console.log(`select(5) = ${res}`)
  })
  bf.predecessor(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`predecessor(24) = ${res}`)
  })
  bf.successor(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`successor(24) = ${res}`)
  })
})
