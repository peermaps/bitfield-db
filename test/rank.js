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

test('single run rank', function (t) {
  t.plan(2*200+1)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  for (var i = 0; i < 50; i++) {
    expected[i] = sum
  }
  for (var i = 50; i < 150; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 150; i < 200; i++) {
    expected[i] = sum
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 200; i++) (function (i) {
      rset.rank(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected[i], `rank(${i})`)
      })
    })(i)
  })
})

test('several runs rank', function (t) {
  t.plan(2*200+1)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  for (var i = 0; i < 10; i++) {
    expected[i] = sum
  }
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 50; i < 80; i++) {
    expected[i] = sum
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 120; i < 125; i++) {
    expected[i] = sum
  }
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 150; i < 155; i++) {
    expected[i] = sum
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 170; i < 200; i++) {
    expected[i] = sum
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 200; i++) (function (i) {
      rset.rank(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected[i])
      })
    })(i)
  })
})

test('several runs with updates', function (t) {
  t.plan(2*200*2+2)
  var rset = new RSet(ram())
  var set = new Set
  var expected = {}
  var sum = 0
  for (var i = 0; i < 10; i++) {
    expected[i] = sum
  }
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 50; i < 80; i++) {
    expected[i] = sum
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 120; i < 125; i++) {
    expected[i] = sum
  }
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 150; i < 155; i++) {
    expected[i] = sum
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
    expected[i] = sum++
  }
  for (var i = 170; i < 200; i++) {
    expected[i] = sum
  }
  rset.flush(function (err) {
    t.ifError(err)
    var pending = 201
    for (var i = 0; i < 200; i++) (function (i) {
      rset.rank(i, function (err, res) {
        t.ifError(err)
        t.equal(res, expected[i], `rank(${i})`)
        if (--pending === 0) update()
      })
    })(i)
    if (--pending === 0) update()
  })
  function update () {
    var sum = expected[120]
    for (var i = 120; i < 125; i++) {
      set.add(i)
      rset.add(i)
      expected[i] = sum++
    }
    for (var i = 125; i < 200; i++) {
      expected[i] += 5
    }
    rset.flush(function (err) {
      t.ifError(err)
      for (var i = 0; i < 200; i++) (function (i) {
        rset.rank(i, function (err, res) {
          t.ifError(err)
          t.equal(res, expected[i], `rank(${i})`)
        })
      })(i)
    })
  }
})
