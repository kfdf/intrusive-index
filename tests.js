import assert from 'assert'
import createIndex from './index.js'
const { floor, min, max, random } = Math
const Index = createIndex()

function printNode(node, l, r, d, padding = 0) {
  if (node == null) return
  printNode(node[r], l, r, d, padding + 4)
  let diff = 
    (node[d] & 3) == 1 ? '=' : 
    (node[d] & 3) < 0 ? '<' : '>'
  let size = node[d] >>> 2
  console.log(' '.repeat(padding) + size + 
    ' ' + diff + ' ' + node.value)
  printNode(node[l], l, r, d, padding + 4)
} 
function print(index) {
  let { root } = index
  let { l, r, d } = index.constructor
  printNode(root[l], l, r, d)
}
function generateValues(n = 10, maxValue = 10) {
  console.log('generating values...')
  let values = []
  let mid = 0.5
  for (let i = 0; i < n; i++) {
    let value = floor(random() * maxValue) + 1
    mid += random() * 0.1 - 0.05
    mid = min(max(0, mid), 1)
    values.push(random() < mid ? value : -value)
  }
  return values
}


function testValues(values) {
  console.log('testing operations...')
  let index = new Index((a, b) => a.value - b.value)
  let set = new Set()
  let len = 0
  try {
    for (let value of values) {
      len++
      if (len % 10 === 0 && index.size) {
        let i = floor(random() * index.size)
        let val = index.getAt(i).value
        index.deleteAt(i)
        assert(set.delete(val))
      } else if (value > 0) {
        let added = index.add({ value })
        assert(added != set.has(value))
        set.add(value)
      } else {
        let deleted = index.delete({ value: -value })
        assert(deleted == set.delete(-value))
      }
      index.validate()
      assert(index.size == set.size)
    }
  } catch (err) {
    console.log(err)
    console.log('-----------')    
    console.log(values.slice(0, len).join(', '))
    console.log('-----------')
  } finally {
    return { index, set }
  }
}
function testQueries(index, set) {
  console.log('testing queries...')
  assert(index.size > 0, 'really?')
  let ref = [...set].sort((a, b) => a - b)
  for (let i = -1; i <= ref.length; i++) {
    let node = index.getAt(i)
    let value = node ? node.value : null
    assert(ref[i] == value)
  }

  function getValue(i) {
    if (i < 0) return ref[0] - 1
    if (i < ref.length) return ref[i]
    return ref[ref.length - 1] + 1
  }
  function testRange(i1, i2) {
    let reversed = i1 > i2
    if (reversed) [i1, i2] = [i2, i1]
    let v1 = getValue(i1)
    let v2 = getValue(i2)
    let comp = n => n.value < v1 ? -1 : n.value < v2 ? 0 : 1
    let { start, end } = index.findRange(comp)
    assert(start == min(max(0, i1), ref.length))
    assert(end == min(max(0, i2), ref.length))

    let rator = index.enumerateRange(start, end, reversed)
    let rator2 = index.enumerate(comp, reversed)
    for (let { value } of rator2) {
      assert(rator.moveNext())
      assert(value === rator.current.value)
      assert(value === reversed ? ref[--end] : ref[start++])
    }
    assert(!rator.moveNext())    
  }
  testRange(0, 0)
  testRange(index.size, index.size)
  testRange(0, index.size + 10)
  testRange(index.size, -10)
  testRange(-10, -10)
  testRange(index.size + 10, index.size + 10)
  for (let i = 0; i < 2; i++) {
    let i1 = floor(random() * ref.length)
    let i2 = floor(random() * ref.length)
    testRange(i1, i1)
    testRange(i2, i2)
    testRange(-10, i1)
    testRange(i2, -10)
    testRange(i1, index.size + 10)
    testRange(index.size + 10, i2)
    testRange(i1, i2)
    testRange(i2, i1)
  }

}
let values = generateValues(10000, 100)
let { index, set } = testValues(values)
testQueries(index, set)

// print(index)
// index.add({ value: 7 })
// index.validate()

console.log('all done')
