import createIndex from './index.js'
const Index = createIndex()
const { l, r, d } = Index
let sum = 0
for (let i = 0; i < 100; i++) {
  let ii = new Index((a, b) => a.value - b.value)
  for (let j = 0; j < 100; j++) {
    ii.add({
      ['foo_' + i]: j,
      value: j
    })
  }
  let rator = ii.enumerateRange()
  while (rator.moveNext()) {
    sum += rator.current.value
  }
}

function Row(value) { this.value = value }

/** @type {(a: Row, b: Row) => number} */
let comparer = (a, b) => a.value - b.value
let ii = new Index(comparer)
let start = Date.now()
while (ii.size < 100000) {
  // let value = Math.floor(Math.random() * 1000000000)
  // ii.add(new Row(value))
  ii.add({ 
    [l]: null, 
    [r]: null, 
    [d]: 1, 
    value: ii.size,
  })
}
console.log(Date.now() - start)
start = Date.now()
sum = 0
// for (let { value } of ii.enumerateRange()) sum += value
let rator = ii.enumerateRange()
while (rator.moveNext()) {
  sum += rator.current.value
}

console.log(Date.now() - start, sum, process.memoryUsage())

