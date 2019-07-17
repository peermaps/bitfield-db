var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single small array add', function (t) {
  t.plan(101)
  var rset = new RSet(ram())
  var set = [5,10,15,20,23,24,26,27]
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 50; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.includes(i), 'has '+i+': '+set.includes(i))
      })
    })(i)
  })
})

test('multi-slot small array add', function (t) {
  t.plan(99)
  var rset = new RSet(ram())
  var set = [50,100,80000,90000,140000,150000,200000]
  set.forEach(x => rset.add(x))
  var checks = []
  set.forEach(function (x) {
    for (var i = -3; i <= +3; i++) {
      checks.push(x+i)
    }
  })
  rset.flush(function (err) {
    t.ifError(err)
    checks.forEach(function (n) {
      rset.has(n, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.includes(n), 'has '+n+': '+set.includes(n))
      })
    })
  })
})
