var test = require('tape')
var count = require('../lib/count.js')

test('set count runs', function (t) {
  t.equal(count.setRuns([3,4,5,7,9,10]), 3)
  t.equal(count.setRuns([1,2,3,4,5,6,7,8,9,10]), 1)
  t.equal(count.setRuns([3,4,5,6,8,9,10]), 2)
  t.end()
})

test('merge count runs', function (t) {
  t.equal(
    count.mergeRuns([7,8,9],Buffer.from([0,0,10])),
    1,
    'array: 1'
  )
  t.equal(
    count.mergeRuns([4,5,7,9],Buffer.from([0,0,10])),
    3,
    'array: 3'
  )
  t.equal(
    count.mergeRuns([4,5,7,9],Buffer.from([1,0b00001100,0b00000101])),
    2,
    'bitfield'
  )
  t.end()
})
