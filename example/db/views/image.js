import { IIA, IIB } from '../intrusive-index.js'
import * as db from '../index.js'
import { compareStrings } from '../comparators.js'
import { createMerger, addRow, getReplaced, getDeleted, DbError, replaceRow, deleteRow } from '../dml-helpers.js'
import { booleanType, numberType, stringType } from '../type-hints.js'

export function Row({
  imageId = stringType,
  locked = booleanType,
  refCount = numberType
} = {}) {
  this.imageId = imageId
  this.locked = locked
  this.refCount = refCount
  this[IIA.l] = this[IIB.l] = null
  this[IIA.r] = this[IIB.r] = null
  this[IIA.d] = this[IIB.d] = -1
}
let mergeInto = createMerger(new Row(), 1)

/**
@template K
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Pick<Row, K>>} ImageIndex<K> */

/** @type{ImageIndex<'imageId'>} */
export const pk = new IIA((a, b) => 
  compareStrings(a.imageId, b.imageId))

/** @type{ImageIndex<'imageId' | 'refCount'>} */
export const isUsedIx = new IIB((a, b) => 
  Math.sign(a.refCount) - Math.sign(b.refCount) ||
  pk.comp(a, b))

/**
@param {db.Transaction} tr
@param {Row} values */
export function create(tr, values) {
  let row = new Row(values)
  addRow(tr, pk, row)
  addRow(tr, isUsedIx, row, true)
  return row
}
export function verifyUnlocked(row) {
  if (row.locked) throw new DbError({
    reason: 'locked', index: pk
  })
}
export function verifyChildless(row) {
  let child = 
    db.game.imageFk.get(a => pk.comp(a, row)) ||
    db.character.imageFk.get(a => pk.comp(a, row))
  if (child) throw new DbError({
    reason: 'restricted', index: pk
  })  
}
/** 
@param {db.Transaction} tr
@param {Pick<Row, 'imageId'>} row
@param {Pick<Row, 'imageId'>} old */
export function updateRefCounts(tr, row, old) {
  if (row && old && pk.comp(row, old) == 0) return
  if (old && old.imageId) {
    update(tr, old, (added, replaced) => {
      added.refCount = replaced.refCount - 1
    })
  }
  if (row && row.imageId) {
    update(tr, row, (added, replaced) => {
      added.refCount = replaced.refCount + 1
    })
  }
}
/**
@param {db.Transaction} tr
@param {Pick<Row,'imageId'> & Partial<Row>} values 
@param {(row: Row, old: Row) => void} callback*/
export function update(tr, values, callback = null) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  mergeInto(row, old)
  if (callback) callback(row, old)
  replaceRow(tr, isUsedIx, row, old, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'imageId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, isUsedIx, row, true)
}