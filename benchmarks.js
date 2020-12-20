import { IIA } from './index.js'
let sum = 0
for (let i = 0; i < 10; i++) {
  let ii = new IIA((a, b) => a.value - b.value)
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
  for (let i = 0; i < ii.size; i++) {
    let rator = ii.enumerateRange(i, i + 1)
    while (rator.moveNext()) {
      sum += rator.current.value
    }    
    sum += ii.getAt(i).value
    sum += ii.get({ value: i }).value    
    sum += ii.get(n => n.value - i).value    
  }  
}

function Row(value) { 
  this[IIA.l] = null 
  this[IIA.r] = null
  this[IIA.d] = 1
  this.value = value 
}

/** @type {import('./index.js').IntrusiveIndex<Row>} */
let ii = new IIA((a, b) => a.value - b.value)
let values = Array(1000000)
  .fill(0)
  .map((_, i) => i)
  .sort((a, b) => Math.random() - 0.5)

let start = Date.now()
for (let i = 0; i < values.length; i++) {
  // ii.add({ 
  //   [IIA.l]: null,
  //   [IIA.r]: null,
  //   [IIA.d]: 1,
  //   value: i
  // })
  ii.add(new Row(values[i]))
}
console.log(Date.now() - start)
console.log(process.memoryUsage())
start = Date.now()
sum = 0
// for (let { value } of ii.enumerateRange()) {
//   sum += value
// } 
let rator = ii.enumerateRange()
while (rator.moveNext()) {
  sum += rator.current.value
}
// for (let i = 0; i < ii.size; i += 1) {
  // sum += ii.getAt(i).value
  // let rator = ii.enumerateRange(i, i + 1)
  // while (rator.moveNext()) {
  //   sum += rator.current.value
  // }
// }
// for (let i = 0; i < ii.size; i++) {
  // let value = values[i]
  // sum += ii.getAt(i).value
  // sum += ii.get({ value }).value
  // sum += ii.get(n => n.value - value).value
// }
console.log(Date.now() - start, sum)

