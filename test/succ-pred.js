var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single small array succ/pred', function (t) {
  t.plan(1+28*2+35*2)
  var rset = new RSet(ram())
  var set = [5,10,15,20,23,24,26,27]
  var succ = {
    0: 5, 1: 5, 2: 5, 3: 5, 4: 5,
    5: 10, 6: 10, 7: 10, 8: 10, 9: 10,
    10: 15, 11: 15, 12: 15, 13: 15, 14: 15,
    15: 20, 16: 20, 17: 20, 18: 20, 19: 20,
    20: 23, 21: 23, 22: 23,
    23: 24,
    24: 26, 25: 26,
    26: 27,
    27: -1
  }
  var pred = {
    0: -1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1,
    6: 5, 7: 5, 8: 5, 9: 5, 10: 5,
    11: 10, 12: 10, 13: 10, 14: 10, 15: 10,
    16: 15, 17: 15, 18: 15, 19: 15, 20: 15,
    21: 20, 22: 20, 23: 20,
    24: 23,
    25: 24, 26: 24,
    27: 26,
    28: 27, 29: 27, 30: 27, 500: 27, 5000: 27, 500000: 27, 500000000: 27
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(succ).forEach(function (n) {
      rset.succ(n, function (err, res) {
        t.ifError(err)
        t.equal(res, succ[n], `succ(${n})`)
      })
    })
    Object.keys(pred).forEach(function (n) {
      rset.pred(n, function (err, res) {
        t.ifError(err)
        t.equal(res, pred[n], `pred(${n})`)
      })
    })
  })
})

test('array+bitfield+run succ/pred', function (t) {
  t.plan(23)
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
  for (var i = 0; i < 20; i++) {
    set.add(0xffff*4+16000+i)
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
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
  })
})

test('single small array succ0/pred0', function (t) {
  var succ0 = {
    0: 1, 1: 2, 2: 3, 3: 4, 4: 6,
    5: 6, 6: 7, 7: 8, 8: 9, 9: 16,
    10: 16, 11: 16, 12: 16, 13: 16, 14: 16,
    15: 16, 16: 17, 17: 18, 18: 19, 19: 21,
    20: 21, 21: 22, 22: 25, 23: 25, 24: 25,
    25: 28, 26: 28, 27: 28, 28: 29, 29: 30,
    30: 31, 31: 32, 32: 33, 33: 34, 34: 35,
    100: 101, 1000: 1001, 5005: 5006, 50000: 50001
  }
  var pred0 = {
    0: -1, 1: 0, 2: 1, 3: 2, 4: 3,
    5: 4, 6: 4, 7: 6, 8: 7, 9: 8,
    10: 9, 11: 9, 12: 9, 13: 9, 14: 9,
    15: 9, 16: 9, 17: 16, 18: 17, 19: 18,
    20: 19, 21: 19, 22: 21, 23: 22, 24: 22,
    25: 22, 26: 25, 27: 25, 28: 25, 29: 28,
    30: 29, 31: 30, 32: 31, 33: 32, 34: 33,
    100: 99, 1000: 999, 5005: 5004, 50000: 49999
  }
  t.plan(1+2*Object.keys(succ0).length+2*Object.keys(pred0).length)
  var rset = new RSet(ram())
  var set = [5,10,11,12,13,14,15,20,23,24,26,27]
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    Object.keys(succ0).forEach(function (n) {
      rset.succ0(n, function (err, res) {
        t.ifError(err)
        t.equal(res, succ0[n], `succ0(${n})`)
      })
    })
    Object.keys(pred0).forEach(function (n) {
      rset.pred0(n, function (err, res) {
        t.ifError(err)
        t.equal(res, pred0[n], `pred0(${n})`)
      })
    })
  })
})

test('array+bitfield+run succ0/pred0', function (t) {
  t.plan(21)
  var rset = new RSet(ram())
  var set = new Set([5,10,11,12,13,14,15,20,23,24,26,27]) // array in block 0
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
  for (var i = 0; i < 20; i++) {
    set.add(0xffff*4+16000+i)
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    rset.succ0(0xffff*4+5000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+10000)
    })
    rset.pred0(0xffff*4+10000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+4999)
    })
    rset.succ0(0xffff*4+8000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+10000)
    })
    rset.pred0(0xffff*4+8000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+4999)
    })
    rset.succ0(0xffff*4+16010, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+16020)
    })
    rset.pred0(0xffff*4+16010, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*4+15999)
    })
    rset.succ0(0xffff*3+6000, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*3+6001)
    })
    rset.pred0(0xffff*3+6001, function (err, res) {
      t.ifError(err)
      t.equal(res, 0xffff*3+5999)
    })
    rset.pred0(11, function (err, res) {
      t.ifError(err)
      t.equal(res, 9)
    })
    rset.succ0(23, function (err, res) {
      t.ifError(err)
      t.equal(res, 25)
    })
  })
})
