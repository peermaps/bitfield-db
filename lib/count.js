var ARRAY = 0, BITFIELD = 1, RUN = 2

exports.setRuns = function (set) { // set should be sorted
  var count = 1
  for (var i = 1; i < set.length; i++) {
    if (set[i] !== set[i-1]+1) count++
  }
  return count
}

exports.mergeRuns = function (set, buf) { // set should be sorted
  var count = 1
  if (buf[0] === ARRAY) {
    var i = 0, j = 0
    var curBuf = buf.readUInt16BE(1)
    var curSet = set[0]
    var cur = Math.min(curBuf, curSet)
    var prev = -1
    while (curBuf < Infinity || curSet < Infinity) {
      if (curSet < curBuf) {
        if (prev >= 0 && prev+1 !== curSet) count++
        prev = curSet
        curSet = set[++i]
      } else {
        if (prev >= 0 && prev+1 !== curBuf) count++
        prev = curBuf
        if (j+1 < (buf.length-1)/2) {
          curBuf = buf.readUInt16BE(1+(++j)*2)
        } else {
          curBuf = Infinity
        }
      }
    }
  } else if (buf[0] === BITFIELD) {
    var i = 0
    var curBuf = nextBit(buf,0)
    var curSet = set[0]
    var cur = Math.min(curBuf, curSet)
    var prev = -1
    while (curBuf < Infinity || curSet < Infinity) {
      if (curSet < curBuf) {
        if (prev >= 0 && prev+1 !== curSet) count++
        prev = curSet
        curSet = set[++i]
      } else {
        if (prev >= 0 && prev+1 !== curBuf) count++
        prev = curBuf
        curBuf = nextBit(buf, curBuf+1)
      }
    }
  }
  return count
}

function nextBit (buf, i) {
  var bitlen = (buf.length-1)*8
  while (((buf[1+Math.floor(i/8)]>>(i%8))&1)===0) {
    i++
    if (i >= bitlen) return Infinity
  }
  return i
}
