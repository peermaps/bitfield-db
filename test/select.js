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
    8: -1,
    9: -1
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
    12: -1
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
    expected[i] = -1
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
  t.plan(2*200*4+2)
  var rset = new RSet(ram())
  var set = new Set
  var expected0 = {}
  var expected1 = {}
  var sum1 = 0, sum0 = 0
  for (var i = 0; i < 10; i++) {
    expected0[sum0++] = i
  }
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
    expected1[sum1++] = i
  }
  for (var i = 50; i < 80; i++) {
    expected0[sum0++] = i
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
    expected1[sum1++] = i
  }
  var rankOne120 = sum1
  var rankZero120 = sum0
  for (var i = 120; i < 125; i++) {
    expected0[sum0++] = i
  }
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
    expected1[sum1++] = i
  }
  for (var i = 150; i < 155; i++) {
    expected0[sum0++] = i
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
    expected1[sum1++] = i
  }
  for (var i = sum1; i < 200; i++) {
    expected1[i] = -1
  }
  for (var i = 170; sum0 < 200; i++) {
    expected0[sum0++] = i
  }
  rset.flush(function (err) {
    t.ifError(err)
    ;(function next (i) {
      if (i === 200) return update()
      var pending = 3
      rset.select1(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected1[i], `select1(${i})`)
        if (--pending === 0) next(i+1)
      })
      rset.select0(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected0[i], `select0(${i})`)
        if (--pending === 0) next(i+1)
      })
      if (--pending === 0) next(i+1)
    })(0)
  })
  function update () {
    var sum1 = rankOne120
    var sum0 = rankZero120
    console.log(`sum0=${sum0}`)
    for (var i = 120; i < 125; i++) {
      set.add(i)
      rset.add(i)
      expected1[sum1++] = i
    }
    for (var i = 125; i < 150; i++) {
      expected1[sum1++] = i
    }
    for (var i = 150; i < 155; i++) {
      expected0[sum0++] = i
    }
    console.log(`sum0=${sum0}`)
    for (var i = 155; i < 170; i++) {
      expected1[sum1++] = i
    }
    for (var i = 170; sum0 < 200; i++) {
      expected0[sum0++] = i
    }
    rset.flush(function (err) {
      t.ifError(err)
      ;(function next (i) {
        if (i === 200) return
        var pending = 3
        rset.select1(i, function (err, res) {
          t.ifError(err)
          t.equal(res, expected1[i], `select1(${i})`)
          if (--pending === 0) next(i+1)
        })
        rset.select0(i, function (err, res) {
          t.ifError(err)
          t.equal(res, expected0[i], `select0(${i})`)
          if (--pending === 0) next(i+1)
        })
        if (--pending === 0) next(i+1)
      })(0)
    })
  }
})
