import { IndexIterator } from 'intrusive-index'
import { pageSize } from '../config.js'
export { DbError } from './dml-helpers.js'
/** 
@template T
@template U
@typedef {import('intrusive-index').IntrusiveIndex<T, U>} IntrusiveIndex */

export function generator(func) {
  return rator => IndexIterator.from(func(rator))
}
/**
@template T
@param {(a: T) => any} keySelector
@returns {(rator: IndexIterator<T>) => IndexIterator<T>} */
export function sortBy(keySelector) {
  let index = 0
  return rator => rator
    .map(value => ({ 
      key: keySelector(value), 
      index: index++,
      value,
    }))
    .sort((a, b) => { 
      if (a.key < b.key) return -1
      if (a.key > b.key) return 1
      return a.index - b.index
    })
    .map(a => a.value)
}

// .map(g => g.toArray())
// .map(g => ({ 
//   key: keySelector(g[0])
//   values: g.map(valueSelector).filter(v => v), 
// }))


function* keyedGroupsGen(rator, keySelector, valueSelector) {
  while (rator.moveNext()) {
    let group = rator.current
    let key = undefined
    let values = []
    while (group.moveNext()) {
      let { current } = group
      if (key === undefined) key = keySelector(current)
      let value = valueSelector(current)
      if (value) values.push(value)
    }
    yield { key, values }
  }
}
// class KeyedGroupsIterator extends IndexIterator {
//   constructor(rator, keySelector, valueSelector) {
//     super()
//     this.rator = rator
//     this.keySelector = keySelector
//     this.valueSelector = valueSelector
//   }
//   moveNext() {
//     let { rator, keySelector, valueSelector } = this
//     if (!rator.moveNext()) {
//       this.current = undefined
//       return false
//     }
//     let group = rator.current
//     let key = undefined
//     let values = []
//     while (group.moveNext()) {
//       let { current } = group
//       if (key === undefined) key = keySelector(current)
//       let value = valueSelector(current)
//       if (value) values.push(value)
//     } 
//     this.current = { key, values }   
//     return true
//   }
// }
/**
@template T
@template K
@template V
@param {(a: T) => K} keySelector
@param {(a: T) => V} valueSelector
@returns {(rator: IndexIterator<IndexIterator<T>>) => IndexIterator<{ key: K, values: V[] }>} */
export function keyedGroups(keySelector, valueSelector) {
  return rator => IndexIterator
    .from(keyedGroupsGen(rator, keySelector, valueSelector))
}
/**
@template T
@param {number} page
@param {number=} start
@param {number=} end
@returns {(index: IntrusiveIndex<T, any>) => IndexIterator<T>} */
export function enumeratePage(page, start, end) {
  return index => {
    if (start === undefined) start = 0
    if (end === undefined) end = index.size
    let from = Math.min(Math.max(start + (page - 1) * pageSize, start), end)
    let upto = Math.min(from + pageSize, end)
    return index.enumerate(from, upto)
  }
}
/**
@template T
@returns {(index: IntrusiveIndex<T, any>) => number} */
export function countPages() {
  return index => Math.ceil(index.size / pageSize)
}
/**
@template T
@param {T} item
@returns {(index: IntrusiveIndex<T, any>) => number} */
export function pageOf(item) {
  return index => Math.ceil(index.findRange(item).end / pageSize)
}

/**
@template T
@param {(a: T) => any} selector 
@returns {(a: T, b: T) => number} */
export function by(selector) {
  return (a, b) => {
    let av = selector(a)
    let bv = selector(b)
    return av < bv ? -1 : av > bv ? 1 : 0
  }
}