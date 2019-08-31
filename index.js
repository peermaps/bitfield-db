var ARRAY = 0, BITFIELD = 1, RUN = 2
var FTREE = 'f!'
var count = require('./lib/count.js')
var MTree = require('./lib/mtree.js')
var rank = require('./lib/rank.js')
var TinyBox = require('tinybox')
var uniq = require('uniq')

module.exports = Bitfield

function Bitfield (storage, opts) {
  if (!(this instanceof Bitfield)) return new Bitfield(storage, opts)
  if (!opts && typeof storage.read !== 'function') {
    opts = storage
    storage = opts.storage
  }
  if (!opts) opts = {}
  this._db = opts.db || new TinyBox(storage)
  this._prefix = opts.prefix || ''
  this._inserts = {}
  this._deletes = {}
  this._blockSize = 8192
  this._length = Math.pow(2, opts.bits || 32)
  this._mtree = new MTree({
    blockSize: this._blockSize,
    length: 0xffff
  })
  this._writeLock = false
  this._writeQueue = []
  this._loadingFTree = {}
}

Bitfield.prototype.add = function (x) {
  var xh = Math.floor(x / 0xffff)
  var xl = x % 0xffff
  if (!this._inserts.hasOwnProperty(xh)) {
    this._inserts[xh] = [xl]
  } else {
    this._inserts[xh].push(xl)
  }
}

Bitfield.prototype.delete = function (x) {
  var xh = Math.floor(x / 0xffff)
  var xl = x % 0xffff
  if (!this._deletes.hasOwnProperty(xh)) {
    this._deletes[xh] = [xl]
  } else {
    this._deletes[xh].push(xl)
  }
}

Bitfield.prototype.has = function (x, cb) {
  var xh = Math.floor(x / 0xffff)
  var xl = x % 0xffff
  this._db.get(this._prefix + String(xh), function (err, node) {
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

Bitfield.prototype.prev =
Bitfield.prototype.prev1 =
Bitfield.prototype.pred =
Bitfield.prototype.pred1 =
Bitfield.prototype.predecessor =
Bitfield.prototype.predecessor1 = function (x, cb) {
  var self = this
  if (typeof x !== 'number') x = Number(x)
  self.rank1(x, function (err, res) {
    if (err) cb(err)
    else self.select1(res-1, cb)
  })
}

Bitfield.prototype.prev0 =
Bitfield.prototype.pred0 =
Bitfield.prototype.predecessor0 = function (x, cb) {
  var self = this
  if (typeof x !== 'number') x = Number(x)
  self.rank0(x, function (err, res) {
    if (err) cb(err)
    else self.select0(res-1, cb)
  })
}

Bitfield.prototype.next =
Bitfield.prototype.next1 =
Bitfield.prototype.succ =
Bitfield.prototype.succ1 =
Bitfield.prototype.successor =
Bitfield.prototype.successor1 = function (x, cb) {
  var self = this
  if (typeof x !== 'number') x = Number(x)
  self.rank1(x+1, function (err, res) {
    if (err) cb(err)
    else self.select1(res, cb)
  })
}

Bitfield.prototype.next0 =
Bitfield.prototype.succ0 =
Bitfield.prototype.successor0 = function (x, cb) {
  var self = this
  if (typeof x !== 'number') x = Number(x)
  self.rank0(x+1, function (err, res) {
    if (err) cb(err)
    else self.select0(res, cb)
  })
}

Bitfield.prototype.rank =
Bitfield.prototype.rank1 = function (x, cb) {
  // number of elements < x
  var self = this
  if (self._writeLock) {
    self._writeQueue.push(function () { self.rank1(x, cb) })
    return
  }
  var xh = Math.floor(x / 0xffff)
  var xl = x % 0xffff
  var i = self._mtree.getKey(xh)
  var pending = 1
  for (var j = 0; j <= i; j++) {
    pending++
    self._loadFTree(j, function (err) {
      if (err) cb(err)
      else if (--pending === 0) done()
    })
  }
  if (--pending === 0) done()
  function done () {
    self._db.get(self._prefix + String(xh), function (err, node) {
      if (err) return cb(err)
      var pre = xh-1 >= 0 ? self._mtree.rank(xh-1) : 0
      if (!node || !node.value) {
        cb(null, pre)
      } else {
        cb(null, pre + rank(node.value,xl))
      }
    })
  }
}

Bitfield.prototype.rank0 = function (x, cb) {
  this.rank1(x, function (err, n) {
    if (err) cb(err)
    else cb(null, x-n)
  })
}

Bitfield.prototype.select =
Bitfield.prototype.select1 = function (i, cb) {
  // return x where rank1(x) = i
  this._select(1, i, cb)
}

Bitfield.prototype.select0 = function (i, cb) {
  // return x where rank0(x) = i
  this._select(0, i, cb)
}

Bitfield.prototype._select = function (digit, i, cb) {
  var self = this
  if (self._writeLock) {
    self._writeQueue.push(function () { self._select(digit, i, cb) })
    return
  }
  var x0 = 0, x1 = self._length, mid = 0
  next()
  function next () {
    if (x0 === self._length) return cb(null, -1)
    if (x0 >= x1) return cb(null, x0-1)
    mid = Math.floor((x0 + x1) * 0.5)
    if (digit === 0) self.rank0(mid, onrank)
    else if (digit === 1) self.rank1(mid, onrank)
  }
  function onrank (err, res) {
    if (err) return cb(err)
    if (i < res) {
      x1 = mid
    } else {
      x0 = mid + 1
    }
    next()
  }
}

Bitfield.prototype.flush = function (opts, cb) {
  var self = this
  if (self._writeLock) {
    self._writeQueue.push(function () { self.flush(opts, cb) })
    return
  }
  self._writeLock = true
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (!cb) cb = noop
  var errored = false
  var mkeys = {}
  var ikeys = Object.keys(this._inserts)
  var dkeys = Object.keys(this._deletes)
  var keys = uniq(ikeys.concat(dkeys))
  var pending = 1
  for (var i = 0; i < keys.length; i++) {
    var set = this._inserts[keys[i]] || []
    var delSet = this._deletes[keys[i]] || []
    pending++
    this._merge(keys[i], set, delSet, done)
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
    if (opts.sync === false) process.nextTick(finish)
    else self._db.flush(finish)
  }
  function finish (err) {
    self._writeLock = false
    if (err) return cb(err)
    var qs = self._writeQueue
    self._writeQueue = []
    for (var i = 0; i < qs.length; i++) {
      qs[i]()
    }
    cb()
  }
}

Bitfield.prototype._merge = function (key, set, delSet, cb) {
  var self = this
  var ikey = Number(key)
  var bkey = self._mtree.getKey(ikey)
  self._db.get(self._prefix + key, function (err, node) {
    if (err) {
      cb(err)
    } else if (!node && set.length < 4096) { // array or run
      set.sort(cmp)
      var nRuns = count.setRuns(set, delSet)
      var delta = count.set(set, delSet)
      if (nRuns*4 < set.length*2) {
        self._db.put(self._prefix + key, buildRun(set, delSet, nRuns))
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      } else {
        self._db.put(self._prefix + key, buildArray(set, delSet))
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      }
    } else if (!node) { // bitfield or run
      set.sort(cmp)
      var nRuns = count.setRuns(set, delSet)
      var delta = count.set(set, delSet)
      if (nRuns*4 < set.length*2) {
        self._db.put(self._prefix + key, buildRun(set, delSet, nRuns))
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      } else {
        self._db.put(self._prefix + key, buildBitfield(set, delSet))
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      }
    } else if (node.value[0] === ARRAY
    && (node.value.length-1)/2 + set.length < 4096) { // array -> array
      var prevSize = (node.value.length-1)/2
      expandSetWithArrayData(set, delSet, node.value)
      set.sort(cmp)
      var delta = count.set(set, delSet) - prevSize
      self._db.put(self._prefix + key, buildArray(set, delSet))
      self._loadFTree(bkey, function (err) {
        if (err) return cb(err)
        self._addPut(ikey, delta)
        cb()
      })
    } else if (node.value[0] === ARRAY) { // array -> bitfield
      var prevSize = (node.value.length-1)/2
      expandSetWithArrayData(set, delSet, node.value)
      var delta = count.set(set, delSet) - prevSize
      self._db.put(self._prefix + key, buildBitfield(set, delSet))
      self._loadFTree(bkey, function (err) {
        if (err) return cb(err)
        self._addPut(ikey, delta)
        cb()
      })
    } else if (node.value[0] === BITFIELD) { // bitfield -> bitfield
      var delta = writeIntoBitfieldData(set, delSet, node.value)
      self._db.put(self._prefix + key, node.value)
      self._loadFTree(bkey, function (err) {
        if (err) return cb(err)
        self._addPut(ikey, delta)
        cb()
      })
    } else if (node.value[0] === RUN) { // run -> array | bitfield | run
      var parsed = parseRuns(node.value)
      set = set.concat(parsed)
      set.sort(cmp)
      var delta = count.set(set, delSet) - parsed.length
      var nRuns = count.setRuns(set, delSet)
      if (nRuns*4 < set.length*2) {
        self._db.put(self._prefix + key, buildRun(set, delSet, nRuns)) // build run
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      } else if (set.length < 4096) {
        self._db.put(self._prefix + key, buildArray(set, delSet)) // build array
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      } else {
        self._db.put(self._prefix + key, buildBitfield(set, delSet)) // build bitfield
        self._loadFTree(bkey, function (err) {
          if (err) return cb(err)
          self._addPut(ikey, delta)
          cb()
        })
      }
    }
  })
}

Bitfield.prototype._loadFTree = function (key, cb) {
  var self = this
  if (self._mtree.chunks.hasOwnProperty(key)) {
    // allowed to zalgo for perf boost:
    return cb()
  }
  if (self._loadingFTree[key]) return self._loadingFTree[key].push(cb)
  self._loadingFTree[key] = []
  self._db.get(self._prefix + FTREE + key, function (err, node) {
    if (err) return done(err)
    if (node && node.value) {
      var buf = node.value
      self._mtree.insertData(key, new Uint16Array(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      ))
    } else {
      self._mtree.chunks[key] = null
    }
    done(null)
  })
  function done (err) {
    var cbs = self._loadingFTree[key]
    self._loadingFTree[key] = null
    for (var i = 0; i < cbs.length; i++) cbs[i](err)
    cb(err)
  }
}

Bitfield.prototype._addPut = function (ikey, x) {
  this._mtree.add(ikey, x)
  var data = this._mtree.getChunk(ikey).data
  this._db.put(this._prefix + FTREE + this._mtree.getKey(ikey),
    Buffer.from(data.buffer, data.byteOffset, data.byteLength))
}

function cmp (a, b) { return a < b ? -1 : +1 }

function buildArray (set, delSet) { // set assumed to be sorted
  var buf = Buffer.alloc(1 + set.length*2)
  buf[0] = ARRAY
  for (var j = 0; j < set.length; j++) {
    if (!delSet.includes(set[j])) buf.writeUInt16BE(set[j],1+j*2)
  }
  return buf
}

function buildBitfield (set, delSet) {
  var buf = Buffer.alloc(8193)
  buf[0] = BITFIELD
  writeIntoBitfieldData(set, delSet, buf)
  return buf
}

function buildRun (set, delSet, nRuns) { // set assumed to be sorted
  var buf = Buffer.alloc(1+4*nRuns)
  buf[0] = RUN
  var offset = 1
  for (var j = 0; delSet.includes(set[j]); j++) {}
  var start = set[j], prev = set[j], end = 0
  for (var i = j+1; i < set.length; i++) {
    if (delSet.includes(set[i])) continue
    if (prev+1 !== set[i]) {
      end = set[i-1]+1
      buf.writeUInt16BE(start, offset+0)
      buf.writeUInt16BE(end, offset+2)
      start = set[i]
      offset += 4
    }
    prev = set[i]
  }
  end = prev + 1
  buf.writeUInt16BE(start, offset+0)
  buf.writeUInt16BE(end, offset+2)
  offset += 4
  return buf
}

function expandSetWithArrayData (set, delSet, buf) {
  for (var i = 1; i < buf.length; i+=2) {
    var x = buf.readUInt16BE(i)
    if (!delSet.includes(x) && !set.includes(x)) set.push(x)
  }
}

function writeIntoBitfieldData (set, delSet, buf) {
  var delta = 0
  for (var i = 0; i < delSet.length; i++) {
    var x = delSet[i]
    var xi = 1+Math.floor(x/8)
    if (((buf[xi]>>(x%8))&1) === 1) {
      delta--
    }
    buf[xi] = buf[xi] & (~(1<<(x%8)))
  }
  for (var i = 0; i < set.length; i++) {
    var x = set[i]
    var xi = 1+Math.floor(x/8)
    if (((buf[xi]>>(x%8))&1) === 0) {
      delta++
    }
    buf[xi] = buf[xi] | (1<<(x%8))
  }
  return delta
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

function noop () {}
