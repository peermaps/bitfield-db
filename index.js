const ARRAY = 0
const BITFIELD = 1
const RUN = 2

module.exports = Roaring

function Roaring (db) {
  if (!(this instanceof Roaring)) return new Roaring(db)
  this._inserts = {}
  this._deletes = {}
  this._db = db
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
    if (!node) return cb(null, false)
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
    } else {
      console.log('TODO: run')
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
    } else if (!node && set.length < 4096) { // array
      set.sort(cmp)
      self._db.put(key, buildSet(set))
      cb()
    } else if (!node) { // bitfield
      self._db.put(key, buildBitfield(set))
      cb()
    } else if (node.value[0] === ARRAY
    && (node.value.length-1)/2 + set.length < 4096) { // array -> array
      expandSetWithArrayData(set, node.value)
      set.sort(cmp)
      self._db.put(key, buildSet(set))
      cb()
    } else if (node.value[0] === ARRAY) { // array -> bitfield
      expandSetWithArrayData(set, node.value)
      self._db.put(key, buildBitfield(set))
      cb()
    } else if (node.value[0] === BITFIELD) { // bitfield -> bitfield
      writeIntoBitfieldData(set, node.value)
      self._db.put(key, node.value)
      cb()
    }
  })
}

function cmp (a, b) { return a < b ? -1 : +1 }

function buildSet (set) {
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

/*
function msb (x) { return 31 - Math.clz32(x) }
function lsb (x) { return msb((x-1)^x) }

function set (field, i, v) {
  var m = Math.floor(i/w)
  while (field.length < m) field.push(0)
  if (v) {
    field[m] = field[m] | (1<<(i%w))
  } else {
    field[m] = field[m] & (wupper-(1<<(i%w)))
  }
}

function ceilLg (x) {
  return x <= 1 ? 0 : 32-Math.clz32(x-1)
}
*/
