import { createFactory } from './index.js'
let IIA = createFactory()()
let mega = true
let n = 1000000
for (let arg of process.argv.slice(2)) {
  if (arg === 'mega') {
    mega = true
  } else if (arg === 'mono') {
    mega = false
  } else if (!isNaN(+arg)) {
    n = +arg
  }
}
if (mega) {
  console.log('warmup...')
  for (let i = 0; i < 10; i++) {
    let sum = 0
    let ii = new IIA((a, b) => a.value - b.value)
    for (let j = 0; j < 100; j++) {
      ii.add({ ['foo' + i]: j, value: j })
    }
    for (let i = 0; i < ii.size; i++) {
      let rator = ii.enumerate(i, i + 2)
      while (rator.moveNext()) {
        sum += rator.current.value
      }  
      let rator2 = ii.enumerate(a => a.value - i)
      while (rator2.moveNext()) {
        sum += rator2.current.value
      }       
      sum += ii.getAt(i).value
      sum += ii.getAt(i, true).value
      sum += ii.get({ value: i }).value    
      sum += ii.get(n => n.value - i, true).value    
      sum += ii.findRange(n => n.value - i, 'any').atStart.value    
    }  
    if (i % 3 === 0) {
      while (ii.size) {
        ii.deleteAt(0)
      } 
    } else if (i % 3 === 1) {
      while (ii.size) {
        ii.delete({ value: ii.size - 1 })
      }
    } else {
      while (ii.size) {
        ii.delete(a => 0)
      }    
    }
  }
}

function Row(value) { 
  this[IIA.l] = null 
  this[IIA.r] = null
  this[IIA.d] = 1
  this.value = value 
}
function enumerateInChunks(ii, chunkSize) {
  let start, sum = 0, len = ii.size
  console.log('enumerating in', chunkSize, 'sized chunks...')
  start = Date.now()
  sum = 0
  for (let i = 0; i < len; i += chunkSize) {
    let pred = a => a.value < i ? -1: a.value < i + chunkSize ? 0 : 1
    let { start, end } = ii.findRange(pred)
    let rator = ii.enumerate(start, end)
    while (rator.moveNext()) {
      sum += rator.current.value
    }      
  }  
  console.log(Date.now() - start,  'findRange + range', sum)
  start = Date.now()  
  sum = 0
  for (let i = 0; i < len; i += chunkSize) {
    let pred = a => a.value < i ? -1: a.value < i + chunkSize ? 0 : 1
    let rator = ii.enumerate(pred)
    while (rator.moveNext()) {
      sum += rator.current.value
    } 
  }
  console.log(Date.now() - start, 'where', sum)
}

function run(values) {
  console.log('creating index...')
  let ii = new IIA((a, b) => a.value - b.value)
  let start = Date.now()
  let sum
  for (let i = 0; i < values.length; i++) {
    ii.add(new Row(values[i]))
  }
  console.log(Date.now() - start)
  console.log('reading values one-by-one...')
  start = Date.now()
  sum = 0
  for (let i = 0, len = values.length; i < len; i++) {
    sum += ii.getAt(values[i]).value
  }
  console.log(Date.now() - start, 'getAt', sum) 
  start = Date.now()
  sum = 0
  for (let i = 0, len = ii.size; i < len; i++) {
    sum += ii.getAt(values[i], true).value
  }
  console.log(Date.now() - start, 'getAt cache', sum)
  start = Date.now()
  sum = 0
  for (let i = 0, len = values.length; i < len; i++) {
    let value = values[i]
    sum += ii.get(a => a.value - value).value
  }
  console.log(Date.now() - start, 'get where', sum)  
  start = Date.now()
  sum = 0
  for (let i = 0, len = values.length; i < len; i++) {
    let value = values[i]
    sum += ii.findRange(a => a.value - value, 'any').atStart.value
  }
  console.log(Date.now() - start, 'findRange', sum)  
  start = Date.now()
  sum = 0
  for (let i = 0, len = values.length; i < len; i++) {
    let value = values[i]
    sum += ii.get({ value }).value
  }
  console.log(Date.now() - start, 'getValue', sum)   
  enumerateInChunks(ii, 1)
  enumerateInChunks(ii, 2)
  enumerateInChunks(ii, 3)
  enumerateInChunks(ii, 5)
  enumerateInChunks(ii, 10)
  enumerateInChunks(ii, 50)
  enumerateInChunks(ii, 1000)
  return ii

}
console.log('creating ' + n + ' values...')
let values = Array(n).fill(0).map((_, i) => i)
let ii = run(values)
console.log('deleting at position 0...')
let start = Date.now()
for (let i = 0; i < values.length; i++) {
  while (ii.size) ii.deleteAt(a => 0)
}
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
