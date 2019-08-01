var Multi = require('../multi')
var ram = require('random-access-memory')
var test = require('tape')

test('multiple bitfields', function (t) {
  var sets = {
    A: new Set([5,10,15,20,23,24,26,27]),
    B: new Set([3,5,10,9000,9001]),
    C: new Set([0,5,1000,50000])
  }
  var check = [
    0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,20,21,22,23,24,25,26,27,28,29,30,
    1000,9000,9001,50000
  ]
  t.plan(1+6+6*check.length)
  var multi = new Multi(ram())
  var bf = {
    A: multi.open('A!'),
    B: multi.open('B!'),
    C: multi.open('C!')
  }
  sets.A.forEach(x => bf.A.add(x))
  sets.B.forEach(x => bf.B.add(x))
  sets.C.forEach(x => bf.C.add(x))

  multi.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < check.length; i++) (function (i) {
      bf.A.has(check[i], function (err, ex) {
        t.ifError(err)
        t.equal(ex, sets.A.has(check[i]), `A has ${check[i]}`)
      })
      bf.B.has(check[i], function (err, ex) {
        t.ifError(err)
        t.equal(ex, sets.B.has(check[i]), `B has ${check[i]}`)
      })
      bf.C.has(check[i], function (err, ex) {
        t.ifError(err)
        t.equal(ex, sets.C.has(check[i]), `C has ${check[i]}`)
      })
    })(i)
    bf.A.rank(23, function (err, res) {
      t.ifError(err)
      t.equal(res, 4)
    })
    bf.B.rank(9000, function (err, res) {
      t.ifError(err)
      t.equal(res, 3)
    })
    bf.C.rank(500, function (err, res) {
      t.ifError(err)
      t.equal(res, 2)
    })
  })
})
