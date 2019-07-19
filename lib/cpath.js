module.exports = function (bf) {
  var sums = new Uint32Array(16)
  ;(function () {
    var sum = 0, pow = 1, index = 0
    while (sum < 2**16) {
      sum += pow
      sums[index++] = sum
      pow *= bf
    }
  })()
  return function (index) {
    var path = []
    for (var level = 0; level < sums.length; level++) {
      if (index < sums[level]) break
    }
    while (index > 0) {
      path.push(index)
      index = parent(index, level)
    }
    path.push(0)
    return path
  }
  function parent (x, level) {
    var i = x - (level > 0 ? sums[level-1] : 0)
    return (level > 1 ? sums[level-2] : 0)
      + Math.floor(i*bf**(level-1)/bf**level)
  }
}
