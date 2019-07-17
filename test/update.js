var RSet = require('../')
var ram = require('random-access-memory')
var TinyBox = require('tinybox')
var test = require('tape')

test('update: array to array', function (t) {
  t.plan(402)
  var rset = new RSet(new TinyBox(ram()))
  var set = new Set([5,10,15,20,23,24,26,27])
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    var pending = 51
    for (var i = 0; i < 50; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        if (--pending === 0) update()
      })
    })(i)
    if (--pending === 0) update()
  })
  function update () {
    var add = [0,9,21,28,100,101,102,120,146,147,149]
    add.forEach(x => {
      rset.add(x)
      set.add(x)
    })
    rset.flush(function (err) {
      t.ifError(err)
      for (var i = 0; i < 150; i++) (function (i) {
        rset.has(i, function (err, ex) {
          t.ifError(err)
          t.equal(ex, set.has(i), 'after update has '+i+': '+set.has(i))
        })
      })(i)
    })
  }
})

test('update: array to bitfield', function (t) {
  t.plan((10011+50)*2+2)
  var rset = new RSet(new TinyBox(ram()))
  var set = new Set([5,10,15,20,23,24,26,27])
  set.forEach(x => rset.add(x))
  rset.flush(function (err) {
    t.ifError(err)
    var pending = 51
    for (var i = 0; i < 50; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        if (--pending === 0) update()
      })
    })(i)
    if (--pending === 0) update()
  })
  function update () {
    for (var i = 6; i < 10006; i+=2) {
      set.add(i)
      rset.add(i)
    }
    rset.flush(function (err) {
      t.ifError(err)
      for (var i = 0; i <= 10010; i++) (function (i) {
        rset.has(i, function (err, ex) {
          t.ifError(err)
          t.equal(ex, set.has(i), 'after update has '+i+': '+set.has(i))
        })
      })(i)
    })
  }
})

test('update: bitfield to bitfield', function (t) {
  t.plan((10021+40001)*2+2)
  var rset = new RSet(new TinyBox(ram()))
  var set = new Set()
  for (var i = 20000; i < 35000; i+=3) {
    set.add(i)
    rset.add(i)
  }
  rset.flush(function (err) {
    t.ifError(err)
    var pending = 10000
    for (var i = 20000-10; i <= 30000+10; i++) (function (i) {
      rset.has(i, function (err, ex) {
        t.ifError(err)
        t.equal(ex, set.has(i), 'has '+i+': '+set.has(i))
        if (--pending === 0) update()
      })
    })(i)
    if (--pending === 0) update()
  })
  function update () {
    for (var i = 6; i < 10006; i+=2) {
      set.add(i)
      rset.add(i)
    }
    rset.flush(function (err) {
      t.ifError(err)
      for (var i = 0; i <= 40000; i++) (function (i) {
        rset.has(i, function (err, ex) {
          t.ifError(err)
          t.equal(ex, set.has(i), 'after update has '+i+': '+set.has(i))
        })
      })(i)
    })
  }
})
