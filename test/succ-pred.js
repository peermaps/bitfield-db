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

test.only('array+bitfield+run succ/pred', function (t) {
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
