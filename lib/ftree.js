module.exports = FTree

function FTree (opts) {
  this.length = opts.length
  if (opts.sparse) {
    this.data = {}
  } else if (opts.data) {
    this.data = opts.data
    this.length = this.data.length
  } else {
    this.data = new Uint16Array(this.length)
  }
}

FTree.prototype.rank = function (x) {
  var sum = 0
  while (x+1 > 0) {
    sum += (this.data[x+1] || 0)
    x -= lsb(x+1)
  }
  return sum
}

FTree.prototype.select = function (i) {
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

FTree.prototype.add = function (i, k) {
  while (i+1 < this.length) {
    this.data[i+1] = (this.data[i+1] || 0) + k
    i += lsb(i+1)
  }
}

function lsb (i) { return ((i) & -(i)) }
