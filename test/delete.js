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
