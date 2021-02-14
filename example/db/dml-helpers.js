import { IndexIterator } from 'intrusive-index'
import { Transaction } from './index.js'

/** 
@template T
@template U
@typedef {import('intrusive-index').IntrusiveIndex<T, U>} IntrusiveIndex */

/** */       
export class DbError extends Error {
  constructor(details = {}) {
    super('db error')
    this.details = details
  }
}
/** @returns {never} */
function fail(details, fatal) {
  if (fatal) {
    console.log(details)
    process.exit()
  } else {
    throw new DbError(details)
  }
}
/** 
@template T
@template U
@param {Transaction} tr
@param {IntrusiveIndex<T, U>} index
@param {T} row 
@param {boolean} failureIsFatal */
export function addRow(tr, index, row, failureIsFatal = false) {
  let added = tr.add(index, row)
  if (!added) fail({
    reason: 'requested', operation: 'add', index, row
  }, failureIsFatal)
  
}
/** 
@template T
@template U
@param {Transaction} tr
@param {IntrusiveIndex<T, U>} index
@param {T} row 
@param {boolean} failureIsFatal
@returns {T} */
export function getReplaced(tr, index, row,  failureIsFatal = false) {
  let replaced = tr.insert(index, row)
  if (!replaced) fail({
    reason: 'requested', operation: 'replace', index, row
  },  failureIsFatal)

  return replaced
}
/** 
@template T
@template U
@param {Transaction} tr
@param {IntrusiveIndex<T, U>} index
@param {T} row
@param {T | null} old can be null for upserts
@param {boolean} failureIsFatal */
export function replaceRow(tr, index, row, old, failureIsFatal = false) {
  let replaced = tr.insert(index, row)
  // @ts-ignore because we can't 
  // express that T extends U in jsdoc
  if (old && !replaced) replaced = tr.delete(index, old)
  if (replaced !== old) fail({
    reason: 'requested', operation: 'replace', index, row
  }, failureIsFatal)
}
/** 
@template T
@template U
@param {Transaction} tr
@param {IntrusiveIndex<T, U>} index
@param {U} key
@param {boolean} failureIsFatal
@returns {T} */
export function getDeleted(tr, index, key, failureIsFatal = false) {
  /** @type{T} */
  //@ts-ignore ditto
  let deleted = tr.delete(index, key)
  if (!deleted) fail({
    reason: 'requested', operation: 'delete', index, key
  }, failureIsFatal)
  return deleted
}
/** 
@template T
@param {Transaction} tr
@param {IntrusiveIndex<T, any>} index
@param {T} row
@param {boolean} failureIsFatal */
export function deleteRow(tr, index, row, failureIsFatal = false) {
  let deleted = tr.delete(index, row)
  if (deleted !== row) fail({
    reason: 'requested', operation: 'delete', index, row
  }, failureIsFatal)
}
/**
@template T
@param {T} template
@param {number} keyLength
@returns {(target: T, source: T) => void} */
export function createMerger(template, keyLength = 0) {
  // @ts-ignore
  return new Function('t', 's', Object
    .keys(template)
    .slice(keyLength)
    .map(p => `if (t.${p} === undefined) t.${p} = s.${p}`)
    .join(';'))
}
/**
@template T
@template U
@param {IntrusiveIndex<T, U>} parentPk 
@param {U} row
@param {U | null} old */
export function verifyFk(parentPk, row, old = null) {
  if (old && parentPk.comp(row, old) === 0) return null
  let parent = parentPk.get(row)
  if (!parent) throw new DbError({
    reason: 'fk', index: parentPk
  })
  return parent
}
/**
@template T
@template U
@param {IntrusiveIndex<T, U>} parentPk 
@param {(a: U) => number} pred */
export function verifyFkComp(parentPk, pred) {
  let parent = parentPk.get(pred)
  if (!parent) throw new DbError({
    reason: 'fk', index: parentPk
  })
  return parent
}
function* getBatches(index, predicate) {
  while (true) {
    let items = index
      .enumerate(predicate)
      .take(100)
      .toArray()  
    if (items.length == 0) break
    yield items
  }
}
// class BatchedIterator extends IndexIterator {
//   constructor(index, predicate) {
//     super()
//     this.index = index
//     this.predicate = predicate
//   }
//   moveNext() {
//     let items = this.index
//       .enumerate(this.predicate)
//       .take(100)
//       .toArray()  
//     if (items.length === 0) {
//       this.current = undefined
//       return false
//     } else {
//       this.current = items
//       return true
//     }
//   }
// }
/**
@template T
@template U
@param {(a: U) => number} predicate
@returns {(index: IntrusiveIndex<T, U>) => IndexIterator<T>} */
export function enumerateSafely(predicate) {
  return index => IndexIterator
    .from(getBatches(index, predicate))
    .flatten()
}
