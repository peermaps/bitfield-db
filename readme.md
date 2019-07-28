# bitfield-db

bitfield database with rank+select over persistent storage

based on [roaring+run][] and [fenwick trees][]

You might want to use a database like this when you have data like an inbox
and you'd like to sort messages into different categories like "read", "unread",
"spam", and "archive" and also where you might want to calculate totals for each
category (rank) and skip to the next or previous message in each category
(implemented internally using select+rank).

Pure javascript implementation and works using the [random-access][] suite of
adaptors. To use this module in the browser, you can use [random-access-web][].

[roaring+run]: https://arxiv.org/pdf/1603.06549.pdf
[fenwick trees]: https://en.wikipedia.org/wiki/Fenwick_tree
[random-access]: https://github.com/random-access-storage/random-access-storage
[random-access-web]: https://github.com/random-access-storage/random-access-web

# api

``` js
var Bitfield = require('bitfield-db')
var raf = require('random-access-file')
var bf = new Bitfield(raf('/tmp/bitfield.db'))

;[5,10,15,20,23,24,26,27].forEach(x => bf.add(x))

bf.flush(function (err) {
  if (err) return console.error(err)
  bf.rank(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`rank(24) = ${res}`)
  })
  bf.select(5, function (err, res) {
    if (err) console.error(err)
    else console.log(`select(5) = ${res}`)
  })
  bf.predecessor(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`predecessor(24) = ${res}`)
  })
  bf.successor(24, function (err, res) {
    if (err) console.error(err)
    else console.log(`successor(24) = ${res}`)
  })
})
```

output:

```
rank(24) = 5
select(5) = 24
successor(24) = 26
predecessor(24) = 23
```

# api

```
var Bitfield = require('bitfield-db')
```

## var bf = new Bitfield(storage, opts)

Create a new bitfield-db instance `bf` from a [random-access][] `store` instance
and optionally:

* opts.bits - maximum size of numbers in the set (`2**bits`). default: 32

Due to limitation of javascript's builtin number type, setting bits more than
`50` may cause errors. Operations will be faster and take less storage with a
smaller bit size.

## bf.add(x)

Add `x` to the set in the current batch.

Only positive integers including zero up to the precision set as `opts.bits` are
allowed for `x`.

You will need to `bf.flush(cb)` the database before queries will reflect this
action.

## bf.delete(x)

Delete `x` from the set in the current batch.

Only positive integers including zero up to the precision set as `opts.bits` are
allowed for `x`.

You will need to `bf.flush(cb)` the database before queries will reflect this
action.

## bf.flush(cb)

Commit the current batch to the database. `cb(err)` is called when the operation
completes.

## bf.has(x, cb)

Test whether `x` is in the set. `cb(err, exists)` is called with a boolean
`exists` or an error `err`.

## bf.rank(x, cb)

Get the number of elements `i` in the set that are less than `x` as
`cb(err, i)`.

## bf.select(i, cb)

Find a value of `x` where `rank(x) = i` as `cb(err, x)`.

If there is no element `x` in the set where `rank(x) = i`, you will receive the
value `-1`.

## bf.predecessor(x, cb)

Return the greatest element `y` in the set where `y < x` as `cb(err, y)`.

aliases:

* bf.pred(x, cb)
* bf.prev(x, cb)

## bf.successor(x, cb)

Return the smallest element `y` in the set where `y > x` as `cb(err, y)`.

aliases:

* bf.succ(x, cb)
* bf.next(x, cb)

# license

[license zero parity](https://licensezero.com/licenses/parity)
