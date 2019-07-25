var FTree = require('./ftree.js')
module.exports = MTree

function MTree (opts) {
  this.blockSize = opts.blockSize
  this.length = opts.length
  this.chunks = {}
  this._keys = []
}

MTree.prototype.insertData = function (i, buf) {
  var key = String(i)
  this.chunks[key] = new FTree({ data: buf })
  if (this._keys.indexOf(key) < 0) {
    this._keys.push(key)
  }
}

MTree.prototype.add = function (i, k) {
  var j = Math.floor(i / this.blockSize)
  var key = String(j)
  if (!this.chunks[j]) {
    this.chunks[key] = new FTree({ length: this.blockSize })
    if (this._keys.indexOf(key) < 0) {
      this._keys.push(key)
    }
  }
  this.chunks[key].add(i % this.blockSize, k)
}

MTree.prototype.select = FTree.prototype.select

MTree.prototype.rank = function (x) {
  var sum = 0
  for (var i = 0; i < this._keys.length && x >= 0; i++) {
    var key = this._keys[i]
    var y = x - this.blockSize * Number(key)
    if (y >= 0) {
      sum += this.chunks[key].rank(Math.min(y, this.blockSize-2))
    }
  }
  return sum
}
