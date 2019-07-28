var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('delete array', function (t) {
  t.plan(10)
  var rset = new RSet(ram())
  var set = new Set([5,10,15,20,23,24,26,27])
  // final: 5,10,12,15,24,26,27
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    rset.delete(20)
    rset.delete(23)
    rset.add(12)
    rset.flush(function (err) {
      t.ifError(err)
      rset.rank(25, function (err, res) {
        t.ifError(err)
        t.equal(res, 5, 'rank(25)')
      })
      rset.has(20, function (err, ex) {
        t.ifError(err)
        t.equal(ex, false, 'has(20)')
      })
      rset.has(12, function (err, ex) {
        t.ifError(err)
        t.equal(ex, true, 'has(12)')
      })
      rset.select(5, function (err, res) {
        t.ifError(err)
        t.equal(res, 26, 'select(5)')
      })
    })
  })
})

test('array+bitfield+run delete', function (t) {
  t.plan(24)
  var rset = new RSet(ram())
  var set = new Set([5,10,15,20,23,24,26,27]) // array in block 0
  for (var i = 0; i < 5000; i++) { // bitfield in block 3
    set.add(0xffff*3+5000+i*2)
  }
  // one big run in block 4 and some smaller ones
  for (var i = 0; i < 5000; i++) {
    set.add(0xffff*4+5000+i)
  }
  for (var i = 0; i < 10; i++) {
    set.add(0xffff*4+12000+i)
  }
  for (var i = 0; i < 25; i++) {
    set.add(0xffff*4+16000+i)
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 20; i < 25; i++) {
      rset.delete(0xffff*4+16000+i)
    }
    rset.flush(check)
  })

  function check (err) {
    t.ifError(err)
    rset.pred(0xffff*5, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+16019)
    })
    rset.pred(0xffff*4+16019, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+16018)
    })
    rset.pred(0xffff*4+16000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+12009)
    })
    rset.pred(0xffff*4+12005, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+12004)
    })
    rset.pred(0xffff*4+12000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+9999)
    })
    rset.pred(0xffff*4+5000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*3+14998)
    })
    rset.pred(0xffff*3+14998, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*3+14996)
    })
    rset.pred(0xffff*3+5000, function (err, res) {
      t.ifError(err)
      t.equal(res, 27)
    })
    rset.pred(20, function (err, res) {
      t.ifError(err)
      t.equal(res, 15)
    })
    rset.pred(15, function (err, res) {
      t.ifError(err)
      t.equal(res, 10)
    })
    rset.pred(5, function (err, res) {
      t.ifError(err)
      t.equal(res, -1)
    })
  }
})

test('delete array to bitfield', function (t) {
  t.plan(8)
  var rset = new RSet(ram())
  for (var i = 0; i < 40; i++) {
    rset.add(1000+i*2)
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 5; i++) {
      rset.delete(1060+i*2)
    }
    for (var i = 0; i < 5000; i++) {
      rset.add(i+1080)
    }
    rset.flush(function (err) {
      t.ifError(err)
      rset.rank(6081, function (err, res) {
        t.ifError(err)
        t.equal(res, 5035)
      })
      rset.successor(1058, function (err, res) {
        t.ifError(err)
        t.equal(res, 1070)
      })
      rset.predecessor(1070, function (err, res) {
        t.ifError(err)
        t.equal(res, 1058)
      })
    })
  })
})

test('delete bitfield to bitfield', function (t) {
  t.plan(8)
  var rset = new RSet(ram())
  for (var i = 0; i < 5000; i++) {
    rset.add(1000+i*2)
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 500; i++) {
      rset.delete(5000*2+i*2)
    }
    rset.add(16000)
    rset.flush(function (err) {
      t.ifError(err)
      rset.select(4500, function (err, res) {
        t.ifError(err)
        t.equal(res, 16000)
      })
      rset.prev(16000, function (err, res) {
        t.ifError(err)
        t.equal(res, 9998)
      })
      rset.next(0, function (err, res) {
        t.ifError(err)
        t.equal(res, 1000)
      })
    })
  })
})
