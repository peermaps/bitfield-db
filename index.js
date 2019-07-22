var ARRAY = 0, BITFIELD = 1, RUN = 2
var count = require('./lib/count.js')
var TinyBox = require('tinybox')

module.exports = Roaring

function Roaring (storage) {
  if (!(this instanceof Roaring)) return new Roaring(storage)
  this._db = new TinyBox(storage)
  this._inserts = {}
  this._deletes = {}
}

Roaring.prototype.add = function (x) {
  var xh = x >> 16
  var xl = x & 0xffff
  if (!this._inserts.hasOwnProperty(xh)) {
    this._inserts[xh] = [xl]
  } else {
    this._inserts[xh].push(xl)
  }
}

Roaring.prototype.delete = function (x) {
}

Roaring.prototype.has = function (x, cb) {
  var xh = x >> 16
  var xl = x & 0xffff
  this._db.get(String(xh), function (err, node) {
    if (err) return cb(err)
    if (!node || node.value.length === 0) return cb(null, false)
    var buf = node.value
    if (buf[0] === ARRAY) { // binary search
      var len = (buf.length-1)/2
      var start = 0, end = len, pk = -1
      while (true) {
        var k = Math.floor((start+end)/2)
        var y = buf.readUInt16BE(1+k*2)
        if (xl === y) return cb(null, true)
        if (pk === k) return cb(null, false)
        pk = k
        if (xl < y) {
          end = k
        } if (xl > y) {
          start = k
        }
      }
    } else if (buf[0] === BITFIELD) {
      cb(null, ((buf[1+Math.floor(xl/8)] >> (xl%8)) & 1) === 1)
    } else if (buf[0] === RUN) { // binary search on ranges
      var len = (buf.length-1)/4
      var start = 0, end = len, pk = -1
      while (true) {
        var k = Math.floor((start+end)/2)
        var xstart = buf.readUInt16BE(1+k*4)
        var xend = buf.readUInt16BE(3+k*4)
        if (xl >= xstart && xl < xend) return cb(null, true)
        if (pk === k) return cb(null, false)
        pk = k
        if (xl < xstart) {
          end = k
        } else if (xl >= xend) {
          start = k
        } else {
          return cb(new Error('unexpected run range state'))
        }
      }
    } else {
      cb(new Error('unexpected field type: ' + buf[0]))
    }
  })
}

Roaring.prototype.pred =
Roaring.prototype.predecessor = function (x) {
  return this.select(this.rank(x)-1)
}

Roaring.prototype.succ =
Roaring.prototype.successor = function (x) {
  return this.select(this.rank(x))
}

Roaring.prototype.rank = function (x) {
  // number of elements < x
  var xh = x >> 16
  var xl = x & 0xffff
}

Roaring.prototype.select = function (i) {
  // return x where rank(x) = i
  return this.key[this.index[i]]
}

Roaring.prototype.flush = function (cb) {
  var self = this
  var errored = false
  var ikeys = Object.keys(this._inserts)
  var pending = 1
  for (var i = 0; i < ikeys.length; i++) {
    var set = this._inserts[ikeys[i]]
    // todo: run container
    pending++
    this._merge(String(ikeys[i]), set, done)
  }
  done()
  function done (err) {
    if (errored) return
    if (err) {
      errored = true
      return cb(err)
    }
    if (--pending !== 0) return
    self._inserts = {}
    self._deletes = {}
    self._db.flush(cb)
  }
}

Roaring.prototype._merge = function (key, set, cb) {
  var self = this
  self._db.get(key, function (err, node) {
    if (err) {
      cb(err)
    } else if (!node && set.length < 4096) { // array or run
      set.sort(cmp)
      var nRuns = count.setRuns(set)
      if (nRuns*4 < set.length*2) {
        self._db.put(key, buildRun(set, nRuns))
      } else {
        self._db.put(key, buildArray(set))
      }
      cb()
    } else if (!node) { // bitfield or run
      set.sort(cmp)
      var nRuns = count.setRuns(set)
      if (nRuns*4 < set.length*2) {
        self._db.put(key, buildRun(set, nRuns))
      } else {
        self._db.put(key, buildBitfield(set))
      }
      cb()
    } else if (node.value[0] === ARRAY
    && (node.value.length-1)/2 + set.length < 4096) { // array -> array
      expandSetWithArrayData(set, node.value)
      set.sort(cmp)
      self._db.put(key, buildArray(set))
      cb()
    } else if (node.value[0] === ARRAY) { // array -> bitfield
      expandSetWithArrayData(set, node.value)
      self._db.put(key, buildBitfield(set))
      cb()
    } else if (node.value[0] === BITFIELD) { // bitfield -> bitfield
      writeIntoBitfieldData(set, node.value)
      self._db.put(key, node.value)
      cb()
    } else if (node.value[0] === RUN) { // run -> array | bitfield | run
      set = set.concat(parseRuns(node.value))
      set.sort(cmp)
      var nRuns = count.setRuns(set)
      if (nRuns*4 < set.length*2) {
        self._db.put(key, buildRun(set, nRuns)) // build run
      } else if (set.length < 4096) {
        self._db.put(key, buildArray(set)) // build array
      } else {
        self._db.put(key, buildArray(set)) // build array
      }
      cb()
    }
  })
}

function cmp (a, b) { return a < b ? -1 : +1 }

function buildArray (set) { // set assumed to be sorted
  var buf = Buffer.alloc(1 + set.length*2)
  buf[0] = ARRAY
  for (var j = 0; j < set.length; j++) {
    buf.writeUInt16BE(set[j],1+j*2)
  }
  return buf
}

function buildBitfield (set) {
  var buf = Buffer.alloc(8193)
  buf[0] = BITFIELD
  writeIntoBitfieldData(set, buf)
  return buf
}

function buildRun (set, nRuns) { // set assumed to be sorted
  var buf = Buffer.alloc(1+4*nRuns)
  buf[0] = RUN
  var offset = 1
  var start = set[0], end = 0
  for (var i = 1; i < set.length; i++) {
    if (set[i] !== set[i-1]+1) {
      end = set[i-1]+1
      buf.writeUInt16BE(start, offset+0)
      buf.writeUInt16BE(end, offset+2)
      start = set[i]
      offset += 4
    }
  }
  end = set[set.length-1]+1
  buf.writeUInt16BE(start, offset+0)
  buf.writeUInt16BE(end, offset+2)
  offset += 4
  return buf
}

function expandSetWithArrayData (set, buf) {
  for (var i = 1; i < buf.length; i+=2) {
    set.push(buf.readUInt16BE(i))
  }
}

function writeIntoBitfieldData (set, buf) {
  for (var i = 0; i < set.length; i++) {
    var x = set[i]
    var xi = 1+Math.floor(x/8)
    buf[xi] = buf[xi] | (1<<(x%8))
  }
}

function parseRuns (buf) {
  var set = []
  for (var i = 1; i < buf.length; i+=4) {
    var start = buf.readUInt16BE(i+0)
    var end = buf.readUInt16BE(i+2)
    for (var j = start; j < end; j++) set.push(j)
  }
  return set
}
