import assert from 'assert'
import { IIA } from './index.js'
const { floor, min, max, random } = Math

function print(index) {
  let { root } = index
  let { l, r, d } = index.constructor
  printNode(root[l])
  function printNode(node, padding = 0) {
    if (node == null) return
    printNode(node[r], padding + 4)
    let diff = 
      (node[d] & 3) == 1 ? '=' : 
      (node[d] & 3) < 0 ? '<' : '>'
    let size = node[d] >>> 2
    console.log(' '.repeat(padding) + size + 
      ' ' + diff + ' ' + node.value)
    printNode(node[l], padding + 4)
  } 
}
export function validateIndex(index) {
  let { root, comp } = index
  let { l, r, d } = index.constructor
  validateNode(root, true)
  function validateNode(node, isRoot) {
    if (node == null) return {
      min: null, max: null,
      height: 0, size: 0
    }    
    if (typeof node[l] != 'object') throw {
      message: `the 'left' property is not an object`,
      current: node,
    }
    if (typeof node[r] != 'object') throw {
      message: `the 'right' property is not an object`,
      current: node,
    }
    if (!Number.isSafeInteger(node[d])) throw {
      message: `the 'diff' property is not an integer`,
      current: node,
    }
  
    let lst = validateNode(node[l])
    let rst = validateNode(node[r])
  
    if (lst.max && comp(lst.max, node) >= 0) throw {
      message: 'the left subtree is ranked higher or equal',
      current: node,
      highestRankingLeft: lst.max
    }
    if (rst.min && comp(rst.min, node) <= 0) throw {
      message: 'the right subtree is ranked lower or equal',
      current: node, 
      lowestRankingRight: rst.min
    }
    let diff = (node[d] & 3) - 1
    if (!isRoot && rst.height - lst.height !== diff) throw {
      message: 'invalid height difference',
      current: node,
      currentDiff: diff, 
      rightHeight: rst.height,
      leftHeight: lst.height,
    }
    let size = node[d] >>> 2
    if (lst.size !== size) throw {
      message: 'invalid size',
      current: node,
      currentSize: size,
      actualSize: lst.size,
    }
    return {
      min: lst.min || node, 
      max: rst.max || node, 
      height: Math.max(lst.height, rst.height) + 1, 
      size: lst.size + rst.size + 1,
    }
  }  
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
  let index = new IIA((a, b) => a.value - b.value)
  let set = new Set()
  let len = 0
  let freq = max(floor(values.length / 1000), 1)
  try {
    for (let value of values) {
      len++
      if (len % 10 === 0 && index.size) {
        let i = Math.abs(value) % index.size
        let repl = index.getAt(i)
        let deleted = index.deleteAt(i)
        assert(deleted === repl)
        assert(set.delete(repl.value))
      } else if (value < 0) {
        let deleted = len % 2 == 0 ? 
          index.delete({ value: -value }) :
          index.delete(a => a.value + value)
        assert(!!deleted == set.delete(-value))
        assert(!deleted || deleted.value === -value)
      } else if (len % 2 == 0) {
        let repl = index.insert({ value })
        if (repl) assert(repl.value === value)
        assert(!!repl == set.has(value))
        set.add(value)
      } else {
        let added = index.add({ value })
        assert(!added == set.has(value))
        set.add(value)
      }
      if (len % freq === 0) validateIndex(index)
      assert(index.size == set.size)
    }
    return { index, set }
  } catch (err) {
    console.log(values.slice(0, len).join(', '))
    console.log('----------')
    throw err
  }
}
function testQueries(index, set) {
  console.log('testing queries...', index.size)
  if (index.size == 0) {
    console.log('index is empty, aborting...')
    return
  }
  let ref = [...set].sort((a, b) => a - b)
  for (let i = -2; i < ref.length + 2; i++) {
    let node = index.getAt(i)
    assert(ref[i] == (node ? node.value : null))
  }
  function getValue(i) {
    if (i < 0) return ref[0] - 1
    if (i < ref.length) return ref[i]
    return ref[ref.length - 1] + 1
  }
  function testRange(i1, i2) {
    let descending = i1 > i2
    if (descending) [i1, i2] = [i2, i1]
    let v1 = getValue(i1)
    let v2 = getValue(i2)
    let comp = n => n.value < v1 ? -1 : n.value < v2 ? 0 : 1
    for (let part of ['full', 'start', 'end', 'any']) {
      let includesStart = part === 'full' || part === 'start'
      let includesEnd = part === 'full' || part === 'end'
      let b1 = random() < 0.5 ? undefined : i1 + floor(random() * 11) - 5
      let b2 = random() < 0.5 ? undefined : i2 + floor(random() * 11) - 5
      let r = index.findRange(comp, part, b1, b2)
      if (b1 !== undefined || b2 !== undefined) {
        if (b1 <= index.size) {
          assert(r.start >= b1)
          if (r.start < r.end) {
            let a = index.getAt(b1)
            if (r.start === b1) {
              assert(comp(a) === 0)
            } else if (a !== undefined) {
              assert(includesStart ? comp(a) < 0 : comp(a) <= 0)
            }
          } 
        }
        if (0 <= b2 && b1 <= b2) {
          assert(r.end <= b2)
          if (r.start < r.end) {
            let a = index.getAt(b2 - 1)
            if (r.end === b2) {
              assert(comp(a) === 0)
            } else if (a !== undefined) {
              assert(includesEnd ? comp(a) > 0 : comp(a) >= 0)
            }
          }          
        }
      }
      if (includesStart) {
        assert(r.preStart === index.getAt(r.start - 1))
      } 
      assert(r.atStart === index.getAt(r.start))
      assert(r.preEnd === index.getAt(r.end - 1))
      if (includesEnd) {
        assert(r.atEnd === index.getAt(r.end))    
      } 
    }
    let { start, end } = index.findRange(comp) 
    assert(start == min(max(0, i1), ref.length))
    assert(end == min(max(0, i2), ref.length))
    let rator = index.enumerate(i1, i2, descending ? 'desc' : 'asc')
    let rator2 = index.enumerate(comp, descending ? 'desc' : 'asc')
    for (let { value } of rator2) {
      assert(value === (descending ? ref[--end] : ref[start++]))
      assert(value === rator.nextValue().value)
    }
    assert(rator.nextValue() === undefined)    
  }
  testRange(0, 0)
  testRange(index.size, index.size)
  testRange(0, index.size + 10)
  testRange(index.size, -10)
  testRange(-10, -10)
  testRange(index.size + 10, index.size + 10)
  for (let i = 0; i < 100; i++) {
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

let values = generateValues(100000, 500)
// let values = [-4, 6, 4, 2, 9, -1, -5, -7, 3, 1, 5, 2, 5, 9]
let { index, set } = testValues(values)
testQueries(index, set)

// print(index)
// index.add({ value: 7 })
// index.validate()

console.log('all done')
