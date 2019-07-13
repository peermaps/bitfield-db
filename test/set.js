const RSet = require('../')
const ram = require('random-access-memory')
const TinyBox = require('tinybox')
const test = require('tape')

test('single small array add', function (t) {
  t.plan(101)
  var rset = new RSet(new TinyBox(ram()))
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
