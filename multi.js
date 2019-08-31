var Bitfield = require('./')
var { nextTick } = require('process')

module.exports = MultiBitfield

function MultiBitfield (storage) {
  if (!(this instanceof MultiBitfield)) return new MultiBitfield(storage)
  this._storage = storage
  this._dbKeys = []
  this._dbs = {}
  this._root = null
}

MultiBitfield.prototype.open = function (prefix, opts) {
  if (typeof prefix === 'object') {
    opts = prefix
    prefix = opts.prefix
  }
  if (!opts) opts = {}
  if (this._dbs.hasOwnProperty(prefix)) return this._dbs[prefix]
  if (!this._root) {
    this._root = this._dbs[prefix] = new Bitfield(Object.assign({}, opts, {
      storage: this._storage,
      prefix
    }))
  } else {
    this._dbs[prefix] = new Bitfield(Object.assign({}, opts, {
      db: this._root._db,
      prefix
    }))
  }
  this._dbKeys.push(prefix)
  return this._dbs[prefix]
}

MultiBitfield.prototype.close = function (prefix) {
  var isRoot = this._db[prefix] === this._root
  var ix = this._dbKeys.indexOf(prefix)
  if (ix >= 0) this._dbKeys.splice(ix,1)
  delete this._db[prefix]
  if (isRoot) {
    this._root = this._db[this._dbKeys[0]]
  }
}

MultiBitfield.prototype.flush = function (cb) {
  var self = this
  if (!this._root) return nextTick(cb)
  var opts = { sync: false }
  var pending = 1, finished = false
  for (var i = 0; i < this._dbKeys.length; i++) {
    var key = this._dbKeys[i]
    pending++
    this._dbs[key].flush(opts, done)
  }
  done()
  function done (err) {
    if (finished) return
    if (err) {
      finished = true
      return cb(err)
    }
    if (--pending === 0) self._root._db.flush(cb)
  }
}
