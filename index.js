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
  var i = x >> 16
  var j = x & 0xffff
  if (!this._inserts.hasOwnProperty(i)) {
    this._inserts[i] = [j]
  } else {
    this._inserts[i].push(j)
  }
}

Roaring.prototype.delete = function (x) {
}

Roaring.prototype.has = function (x, cb) {
  var i = x >> 16
  var xl = x & 0xffff
  this._db.get(String(i), function (err, node) {
    if (err) return cb(err)
    if (!node) return cb(null, false)
    var buf = node.value
    if (buf[0] === ARRAY) {
      // binary search
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
      cb(null, (buf[1+Math.floor(j/8)] >> (j%8)) === 1)
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
  var ikeys = Object.keys(this._inserts)
  for (var i = 0; i < ikeys.length; i++) {
    var set = this._inserts[ikeys[i]]
    // todo: run container
    if (set.length < 4096) { // array
      set.sort(cmp)
      var buf = Buffer.alloc(1 + set.length*2)
      buf[0] = ARRAY
      for (var j = 0; j < set.length; j++) {
        buf.writeUInt16BE(set[j],1+j*2)
      }
      this._db.put(String(i), buf)
    } else { // bitfield
      var buf = Buffer.alloc(1+Math.ceil(set.length/8))
      buf[0] = BITFIELD
      for (var j = 0; j < set.length; j++) {
        var x = set[j]
        var xi = Math.floor(x/8)
        buf[xi] = buf[xi] & (1<<(x%8))
      }
      this._db.put(String(i), buf)
    }
  }
  this._db.flush(cb)
}

function cmp (a, b) { return a < b ? -1 : +1 }

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
