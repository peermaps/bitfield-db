var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single array select', function (t) {
  t.plan(21)
  var rset = new RSet(ram())
  var set = [5,10,15,20,23,24,26,27]
  var expected = {
    0: 5,
    1: 10,
    2: 15,
    3: 20,
    4: 23,
    5: 24,
    6: 26,
    7: 27,
    8: 4294967295,
    9: 4294967295 // could make this -1?
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(expected).forEach(function (n) {
      rset.select(Number(n), function (err, res) {
        t.ifError(err)
        t.equal(res, expected[n], `select(${n})`)
      })
    })
  })
})

test('multi array select', function (t) {
  t.plan(27)
  var rset = new RSet(ram())
  var set = [
    5,10,15,20,23,24,26,27,
    15000,16000,17000,
    500000
  ]
  var expected = {
    0: 5,
    1: 10,
    2: 15,
    3: 20,
    4: 23,
    5: 24,
    6: 26,
    7: 27,
    8: 15000,
    9: 16000,
    10: 17000,
    11: 500000,
    12: 4294967295
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(expected).forEach(function (n) {
      rset.select(Number(n), function (err, res) {
        t.ifError(err)
        t.equal(res, expected[n], `select(${n})`)
      })
    })
  })
})

test('single bitfield select', function (t) {
  t.plan(2**16*2+1)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  for (var i = 0; i < 2**16; i+=2) {
    set.add(i)
    expected[sum] = i
    expected[++sum] = i+1
  }
  for (var i = 2**15; i < 2**16; i++) {
    expected[i] = 4294967295
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    ;(function next (i) {
      if (i >= 2**16) return
      rset.select(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected[i], `select(${i})`)
        next(i+1)
      })
    })(0)
  })
})

test('several runs with updates', function (t) {
  t.plan(2*200*2+2)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
    expected[sum++] = i
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
    expected[sum++] = i
  }
  var rank120 = sum
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
    expected[sum++] = i
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
    expected[sum++] = i
  }
  for (var i = sum; i < 200; i++) {
    expected[i] = 4294967295
  }
  rset.flush(function (err) {
    t.ifError(err)
    ;(function next (i) {
      if (i === 200) return update()
      rset.select(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected[i], `select(${i})`)
        next(i+1)
      })
    })(0)
  })
  function update () {
    var sum = rank120
    for (var i = 120; i < 125; i++) {
      set.add(i)
      rset.add(i)
      expected[sum++] = i
    }
    for (var i = 125; i < 150; i++) {
      expected[sum++] = i
    }
    for (var i = 155; i < 170; i++) {
      expected[sum++] = i
    }
    rset.flush(function (err) {
      t.ifError(err)
      ;(function next (i) {
        if (i === 200) return
        rset.select(i, function (err, res) {
          t.ifError(err)
          t.equal(res, expected[i], `select(${i})`)
          next(i+1)
        })
      })(0)
    })
  }
})
