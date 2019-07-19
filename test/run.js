var RSet = require('../')
var ram = require('random-access-memory')
var test = require('tape')

test('single run', function (t) {
  t.plan(2*200+1)
  var rset = new RSet(ram())
  var set = new Set
  for (var i = 50; i < 150; i++) {
    set.add(i)
    rset.add(i)
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 200; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
      })
    })(i)
  })
})

test('several runs', function (t) {
  t.plan(2*200+1)
  var rset = new RSet(ram())
  var set = new Set
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
  }
  rset.flush(function (err) {
    t.ifError(err)
    for (var i = 0; i < 200; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
      })
    })(i)
  })
})

test('several runs with updates', function (t) {
  t.plan(2*200*2+2)
  var rset = new RSet(ram())
  var set = new Set
  for (var i = 10; i < 50; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 80; i < 120; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 125; i < 150; i++) {
    set.add(i)
    rset.add(i)
  }
  for (var i = 155; i < 170; i++) {
    set.add(i)
    rset.add(i)
  }
  rset.flush(function (err) {
    t.ifError(err)
    var pending = 201
    for (var i = 0; i < 200; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        if (--pending === 0) update()
      })
    })(i)
    if (--pending === 0) update()
  })
  function update () {
    for (var i = 120; i < 125; i++) {
      set.add(i)
      rset.add(i)
    }
    rset.flush(function (err) {
      t.ifError(err)
      for (var i = 0; i < 200; i++) (function (i) {
        rset.has(i, function (err, ex) {
          t.ifError(err)
          t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        })
      })(i)
    })
  }
})
