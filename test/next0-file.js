var BF = require('../')
var Multi = require('../multi')
var raf = require('random-access-file')
var tmpfile = require('tmpfile')
var test = require('tape')

test('next 0 with a file', function (t) {
  t.plan(30*2+1)
  var bf = new BF(raf(tmpfile()))
  var seq = -1
  var results = []
  bf.next0(seq, function f (err, x) {
    t.error(err)
    results.push(x)
    bf.add(x)
    bf.flush(function (err) {
      t.error(err)
      if (x === 29) check()
      else bf.next0(x, f)
    })
  })
  function check () {
    t.deepEqual(results, [
      0,1,2,3,4,5,6,7,8,9,10,
      11,12,13,14,15,16,17,18,19,
      20,21,22,23,24,25,26,27,28,29
    ])
    t.end()
  }
})

test('multi next 0 with a file', function (t) {
  t.plan(30*2+1)
  var multi = new Multi(raf(tmpfile()))
  var bf = multi.open('A!')
  var seq = -1
  var results = []
  bf.next0(seq, function f (err, x) {
    t.error(err)
    results.push(x)
    bf.add(x)
    multi.flush(function (err) {
      t.error(err)
      if (x === 29) check()
      else bf.next0(x, f)
    })
  })
  function check () {
    t.deepEqual(results, [
      0,1,2,3,4,5,6,7,8,9,10,
      11,12,13,14,15,16,17,18,19,
      20,21,22,23,24,25,26,27,28,29
    ])
    t.end()
  }
})
