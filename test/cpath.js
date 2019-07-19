var test = require('tape')
var cpath = require('../lib/cpath.js')

test('cardinality indexes', function (t) {
  var p4 = cpath(4)
  t.deepEqual(p4(62), [62,15,3,0])
  var graph = buildGraph(4, 6)
  for (var i = 0; i < 1000; i++) {
    t.deepEqual(p4(i), traceGraph(graph,i))
  }
  t.end()
})

function traceGraph (graph, index) {
  var indexes = []
  while (index > 0) {
    indexes.push(index)
    index = graph[index]
  }
  indexes.push(index)
  return indexes
}

function buildGraph (bf, depth) {
  var i = 0, levels = []
  for (var j = 0; j < depth; j++) {
    var level = []
    for (var k = 0; k < bf**j; k++) {
      level.push(i++)
    }
    levels.push(level)
  }
  var sums = []
  ;(function () {
    var sum = 0, pow = 1
    for (var i = 0; sum < 2**16; i++) {
      sum += pow
      pow *= bf
      sums.push(sum)
    }
  })()
  var graph = {}
  levels.forEach((row,level) => {
    row.forEach(function (x) {
      graph[x] = parent(x,level)
    })
  })
  return graph
  function parent (x, level) {
    var i = x - (level > 0 ? sums[level-1] : 0)
    return (level > 1 ? sums[level-2] : 0)
      + Math.floor(i*bf**(level-1)/bf**level)
  }
}
