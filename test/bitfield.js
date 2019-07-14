const RSet = require('../')
const ram = require('random-access-memory')
const TinyBox = require('tinybox')
const test = require('tape')

test('single bitfield', function (t) {
  t.plan(2**16*2+1)
  var rset = new RSet(new TinyBox(ram()))
  var set = new Set
  for (var i = 0; i < 2**16; i+=2) {
    set.add(i)
  }
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 2**16; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
      })
    })(i)
  })
})

test('several bitfields', function (t) {
  var offsets = [5000,150000,600000,4500000,6000000]
  t.plan(10021*2*offsets.length+1)
  var rset = new RSet(new TinyBox(ram()))
  var set = new Set
  offsets.forEach(offset => {
    for (var i = 0; i < 10000; i+=2) {
      set.add(offset+i)
    }
  })
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    offsets.forEach(offset => {
      for (var i = offset-10; i <= offset+10010; i++) (function (i) {
        rset.has(i, function (err, ex) {
          t.ifError(err)
          t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        })
      })(i)
    })
  })
})
