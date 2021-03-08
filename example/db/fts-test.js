import { Intersection, Union } from './fts-helpers.js'

class Occurences {
  constructor(array, comparator) {
    this.array = array
    this.comparator = comparator
    this.pos = 0
    this.value = undefined 
    this.matched = false
  }
  advance(c) { 
    let { comparator, array } = this
    while (true) {
      let a = array[this.pos++]
      if (c === undefined || 
        a === undefined || 
        comparator(c, a) <= 0) {
          this.value = a
          this.matched = a !== undefined
          return
        }
    }
  }
}

function* intersection(ablea, ableb) {
  let ratora = ablea[Symbol.iterator]()
  let ratorb = ableb[Symbol.iterator]()
  let a = ratora.next()
  let b = ratorb.next()
  while (!a.done && !b.done)  {
    let cmp = a.value - b.value
    if (cmp === 0) {
      yield a.value
      a = ratora.next()
      b = ratorb.next()
    } else if (cmp < 0) {
      a = ratora.next()
    } else if (cmp > 0) {
      b = ratorb.next()
    } else {
      break
    }
  }
}
function* union(ablea, ableb) {
  let ratora = ablea[Symbol.iterator]()
  let ratorb = ableb[Symbol.iterator]()
  let a = ratora.next()
  let b = ratorb.next()
  while (!a.done || !b.done)  {
    let cmp = a.done ? 1 : b.done ? -1 : a.value - b.value
    if (cmp === 0) {
      yield a.value
      a = ratora.next()
      b = ratorb.next()
    } else if (cmp < 0) {
      yield a.value
      a = ratora.next()
    } else if (cmp > 0) {
      yield b.value
      b = ratorb.next()
    } else {
      break
    }
  }
}
let { floor, random } = Math
function generateData() {
  let len = floor(random() * 10) + 1
  let arrays = []
  while (arrays.length < len) {
    let array = []
    let len = floor(random() * 100)
    let val = 1
    while (array.length < len) {
      val += floor(random() * 10) + 1
      array.push(val)
    }
    arrays.push(array)
  }
  let operations = []
  while (operations.length < len * 2) {
    operations.push(random() < 0.5)
  }  
  return { arrays, operations }
}

function test1({ arrays, operations }) {
  arrays = arrays.slice()
  operations = operations.slice()
  let comparator = (a, b) => a - b
  let tree = []
  while (arrays.length > 0) {
    tree.push(new Occurences(arrays.pop(), comparator))
  }
  while (tree.length > 1) {
    let Operation = operations.pop() ? Union : Intersection
    tree.unshift(new Operation(tree.pop(), tree.pop(), comparator))
  }
  let top = tree.pop()

  let result = []
  while (true) {
    top.advance()
    if (top.matched) result.push(top.value)
    if (top.value === undefined) break
  }
  return result
}
function test2({ arrays, operations }) {
  arrays = arrays.slice()
  operations = operations.slice()
  let tree = []
  while (arrays.length > 0) {
    tree.push(arrays.pop())  
  }
  while (tree.length > 1) {
    let operation = operations.pop() ? union : intersection
    tree.unshift(operation(tree.pop(), tree.pop()))
  }
  return [...tree.pop()]
}
for (let i = 0; i < 100; i++) {
  let data = generateData()
  let result1 = test1(data)
  let result2 = test2(data)
  if (result1.some((v, i) => v !== result2[i])) throw 'oh noes!!'
}
