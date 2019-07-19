module.exports = CIndex

function CIndex (bf) {
  this.branchFactor = bf
  this.sums = new Uint32Array(16)
  var sum = 0, pow = 1, index = 0
  while (sum < 2**16) {
    sum += pow
    this.sums[index++] = sum
    pow *= bf
  }
}

CIndex.prototype.level = function (index) {
  for (var level = 0; level < this.sums.length; level++) {
    if (index < this.sums[level]) break
  }
  return level
}

CIndex.prototype.parent = function (x, level) {
  var i = x - (level > 0 ? this.sums[level-1] : 0)
  return (level > 1 ? this.sums[level-2] : 0)
    + Math.floor(i*this.branchFactor**(level-1)/this.branchFactor**level)
}

CIndex.prototype.path = function (index) {
  var path = []
  var level = this.level(index)
  while (index > 0) {
    path.push(index)
    index = this.parent(index, level)
  }
  path.push(0)
  return path
}
