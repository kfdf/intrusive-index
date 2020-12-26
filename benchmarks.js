import { IIA } from './index.js'

console.log('warmup...')
let sum = 0
for (let i = 0; i < 10; i++) {
  let ii = new IIA((a, b) => a.value - b.value)
  for (let j = 0; j < 100; j++) {
    ii.add({ ['foo' + i]: j, value: j })
  }
  for (let i = 0; i < ii.size; i++) {
    let rator = ii.enumerate(i, i + 1)
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
function enumerateInChunks(ii, chunkSize) {
  let sum = 0
  console.log('enumerating in', chunkSize, 'sized chunks...')
  let start = Date.now()
  for (let i = 0, len = ii.size; i < len; i += chunkSize) {
    let rator = ii.enumerate(i, i + chunkSize)
    while (rator.moveNext()) {
      sum += rator.current.value
    }      
  }
  console.log(Date.now() - start, 'sum =', sum)
}
function run(values) {
  console.log('creating index...')
  let ii = new IIA((a, b) => a.value - b.value)
  let start = Date.now()
  for (let i = 0; i < values.length; i++) {
    ii.add(new Row(values[i]))
  }
  console.log(Date.now() - start)
  console.log('enumerating by index...')
  start = Date.now()
  let sum = 0
  for (let i = 0, len = ii.size; i < len; i++) {
    sum += ii.getAt(i).value
  }
  console.log(Date.now() - start, 'sum =', sum)
  enumerateInChunks(ii, 1)
  enumerateInChunks(ii, 2)
  enumerateInChunks(ii, 3)
  enumerateInChunks(ii, 5)
  enumerateInChunks(ii, 10)
  enumerateInChunks(ii, 50)
  enumerateInChunks(ii, 1000)
  return ii

}
console.log('creating values...')
let values = Array(1000000).fill(0).map((_, i) => i)
let ii = run(values)
console.log('deleting at position 0...')
let start = Date.now()
while (ii.size) ii.deleteAt(0)
console.log(Date.now() - start, 'size = ', ii.size)

console.log('-------------------')
console.log('shuffling values...')
values.sort((a, b) => Math.random() - 0.5)
ii = run(values)
console.log('deleting by value...')
start = Date.now()
for (let i = 0; i < values.length; i++) {
  ii.delete({ value: values[i] })
}
console.log(Date.now() - start, 'size = ', ii.size)
console.log('all done')
