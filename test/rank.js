var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single array rank', function (t) {
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

test('multi array rank', function (t) {
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

test('single bitfield rank', function (t) {
  t.plan(2**16*2+1)
  var rset = new RSet(ram())
  var set = new Set
  var rank = []
  var sum = 0
  for (var i = 0; i < 2**16; i+=2) {
    set.add(i)
    rank[i+0] = sum
    rank[i+1] = ++sum
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 2**16; i++) (function (i) {
      rset.rank(i, function (err, res) {
        t.ifError(err)
        t.equal(res, rank[i], `rank(${i})`)
      })
    })(i)
  })
})

test('multi bitfield rank', function (t) {
  var offsets = [5000,150000,600000,4500000,6000000]
  t.plan(10021*2*offsets.length+1)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  offsets.forEach(offset => {
    for (var i = -10; i < 0; i++) {
      expected[offset+i] = sum
    }
    for (var i = 0; i < 10000; i+=2) {
      set.add(offset+i)
      expected[offset+i+0] = sum
      expected[offset+i+1] = ++sum
    }
    for (var i = 0; i <= 10; i++) {
      expected[offset+10000+i] = sum
    }
  })
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    offsets.forEach(offset => {
      for (var i = offset-10; i <= offset+10010; i++) (function (i) {
        rset.rank(i, function (err, res) {
          t.ifError(err)
          t.equal(res, expected[i])
        })
      })(i)
    })
  })
})
