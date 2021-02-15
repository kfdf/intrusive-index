import { IndexIterator } from './intrusive-index.js'
import { pageSize } from '../config.js'
export { DbError } from './dml-helpers.js'
/** 
@template T
@template U
@typedef {import('./intrusive-index.js').IntrusiveIndex<T, U>} IntrusiveIndex */

export function generator(func) {
  return rator => IndexIterator.from(func(rator))
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