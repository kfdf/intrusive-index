import { Sequence } from './intrusive-index.js'
import { pageSize } from '../config.js'
export { DbError } from './dml-helpers.js'
/** 
@template T
@template U
@typedef {import('./intrusive-index.js').IntrusiveIndex<T, U>} IntrusiveIndex */

/**
@template T
@param {number} page
@param {number=} start
@param {number=} end
@returns {(index: IntrusiveIndex<T, any>) => Sequence<T>} */
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

/**
@template T
@template U
@param {IntrusiveIndex<T, U>} index
@param {(a: U, b: U) => number} comparator */
function* segmentsGen(index, comparator, start = 0 , end = index.size) {
  if (start >= end) return
  let first = index.getAt(start)
  while (true) {
    // @ts-ignore
    let r = index.findRange(a => comparator(a, first))
    yield r
    if (r.end >= end || r.atEnd === undefined) return
    first = r.atEnd
  }
}
/**
works similary to the segment method of the sequence class 
but it operates directly on the index, so it doesn't have to 
enumerate it to find segment bounds. The time complexity is 
proportional to the number of segments, not values. Needed for FTS.
@template T
@template U
@param {(a: U) => number} comparator
@returns {(index: IntrusiveIndex<T, U>) => Sequence<import('../../index.js').FullRange<T, 'full'>>} */
export function segmentRanges(comparator, start = 0, end = undefined) {
  return index => Sequence
    .from(segmentsGen(index, comparator, start, end))
}

/**
@template T
@template U
@template V
@param {Iterable<U>} iterable
@param {(a: T, b: U) => V} selector
@returns {(index: Sequence<T>) => Sequence<V>} */
export function zip(iterable, selector) {
  let seq2 = Sequence.from(iterable)
  return seq => seq   // somewhat brittle code...
    .map(a => selector(a, seq2.nextValue()))
    .concat(seq2.map(a => selector(undefined, a)))
}