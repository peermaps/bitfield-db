var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single node array rank', function (t) {
  t.plan(45)
  var rset = new RSet(ram())
  var set = [5,10,15,20,23,24,26,27]
  var expected = {
    4: 0,
    5: 0,
    6: 1,
    9: 1,
    10: 1,
    11: 2,
    14: 2,
    15: 2,
    16: 3,
    19: 3,
    20: 3,
    21: 4,
    22: 4,
    23: 4,
    24: 5,
    25: 6,
    26: 6,
    27: 7,
    28: 8,
    100: 8,
    50000: 8,
    500000: 8
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(expected).forEach(function (n) {
      rset.rank(Number(n), function (err, res) {
        t.ifError(err)
        t.equal(res, expected[n],
          `rank(${n}) = ${res} (expected ${expected[n]})`)
      })
    })
  })
})

test('multi node array rank', function (t) {
  t.plan(65)
  var rset = new RSet(ram())
  var set = [
    5,10,15,20,23,24,26,27,
    15000,16000,17000,
    500000
  ]
  var expected = {
    4: 0,
    5: 0,
    6: 1,
    9: 1,
    10: 1,
    11: 2,
    14: 2,
    15: 2,
    16: 3,
    19: 3,
    20: 3,
    21: 4,
    22: 4,
    23: 4,
    24: 5,
    25: 6,
    26: 6,
    27: 7,
    28: 8,
    100: 8,
    14999: 8,
    15000: 8,
    15001: 9,
    15999: 9,
    16000: 9,
    16001: 10,
    16999: 10,
    17000: 10,
    17001: 11,
    50000: 11,
    500000: 11,
    500001: 12
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(expected).forEach(function (n) {
      rset.rank(Number(n), function (err, res) {
        t.ifError(err)
        t.equal(res, expected[n],
          `rank(${n}) = ${res} (expected ${expected[n]})`)
      })
    })
  })
})
