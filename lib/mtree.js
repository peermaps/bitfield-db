var FTree = require('./ftree.js')
module.exports = MTree

function MTree (opts) {
  this.blockSize = opts.blockSize
  this.length = opts.length
  this.chunks = {}
}

MTree.prototype.add = function (i, k) {
  var j = Math.floor(i / this.blockSize)
  if (!this.chunks[j]) {
    this.chunks[j] = new FTree({ length: this.blockSize })
  }
  this.chunks[j].add(i % this.blockSize, k)
}

MTree.prototype.select = function (i) {
  var x0 = 0, x1 = this.length
  while (x0 < x1) {
    var mid = Math.floor((x0 + x1) * 0.5)
    if (i <= this.rank(mid)) {
      x1 = mid
    } else {
      x0 = mid + 1
    }
  }
  return x0
}

MTree.prototype.rank = function (x) {
  var sum = 0
  var keys = Object.keys(this.chunks)
  for (var i = 0; i < keys.length && x >= 0; i++) {
    var y = x - this.blockSize * Number(keys[i])
    if (y >= 0) {
      sum += this.chunks[keys[i]].rank(Math.min(y, this.blockSize-2))
    }
  }
  return sum
}
