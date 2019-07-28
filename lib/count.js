var ARRAY = 0, BITFIELD = 1, RUN = 2

exports.setRuns = function (set, delSet) { // set should be sorted
  var count = 1
  for (var j = 0; delSet.includes(set[j]); j++) {}
  var prev = set[j]
  for (var i = j+1; i < set.length; i++) {
    if (delSet.includes(set[i])) continue
    if (prev+1 !== set[i]) count++
    prev = set[i]
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

exports.set = function (set, delSet) {
  if (delSet.length === 0) return set.length
  var count = 0
  for (var i = 0; i < set.length; i++) {
    if (!delSet.includes(set[i])) count++
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

exports.dataRuns = function (buf) {
  var count = 0
  for (var i = 1; i < buf.length; i+=4) {
    var start = buf.readUInt16BE(i+0)
    var end = buf.readUInt16BE(i+2)
    count += end - start
  }
  return count
}
