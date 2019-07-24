var ARRAY = 0, BITFIELD = 1, RUN = 2

module.exports = function (buf, x) {
  if (buf[0] === ARRAY) {
    var len = (buf.length-1)/2
    var start = 0, end = len, pk = -1
    while (true) {
      var k = Math.floor((start+end)/2)
      var y = buf.readUInt16BE(1+k*2)
      if (x === y) return k
      if (pk === k) return end
      pk = k
      if (x < y) {
        end = k
      } if (x > y) {
        start = k
      }
    }
  } else if (buf[0] === BITFIELD) {
    var len = (buf.length-1)/2
    var sum = 0
    var c = Math.ceil(x/8)
    for (var i = 1; i < buf.length; i++) {
      if (x < i*8) {
        sum += countByteBits((buf[i] << (8-x%8)) & 0xff)
        break
      } else {
        sum += countByteBits(buf[i])
      }
    }
    return sum
  } else if (buf[0] === RUN) {
    var sum = 0
    for (var i = 1; i < buf.length; i+=4) {
      var start = buf.readUInt16BE(i+0)
      var end = buf.readUInt16BE(i+2)
      if (x < start) {
        break
      } else if (x >= end) {
        sum += end - start
      } else {
        sum += end - x
        break
      }
    }
    return sum
  } else {
    throw new Error('unhandled node type')
  }
}

function countByteBits (x) {
  return ((x>>0)&1) + ((x>>1)&1) + ((x>>2)&1) + ((x>>3)&1)
    + ((x>>4)&1) + ((x>>5)&1) + ((x>>6)&1) + ((x>>7)&1)
}
