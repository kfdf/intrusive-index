import { IIA } from 'intrusive-index'
import * as db from '../index.js'
import { compareStrings } from '../comparators.js'
import { createMerger, addRow, getReplaced, getDeleted, DbError } from '../dml-helpers.js'
import { booleanType, numberType, stringType } from '../type-hints.js'

export function Row({
  imageId = stringType,
  locked = booleanType,
  // refCount = numberType
} = {}) {
  this.imageId = imageId
  this.locked = locked
  // this.refCount = refCount
  this[IIA.l] = null
  this[IIA.r] = null
  this[IIA.d] = -1
}
let mergeInto = createMerger(new Row(), 1)

export const pk = new IIA((a, b) => 
  compareStrings(a.imageId, b.imageId))


/**
@param {db.Transaction} tr
@param {Row} values */
export function create(tr, values) {
  let row = new Row(values)
  addRow(tr, pk, row)
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
@param {Pick<Row,'imageId'> & Partial<Row>} values 
@param {(row: Row, old: Row) => void} callback*/
export function update(tr, values, callback = null) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  if (callback) callback(row, old)
  mergeInto(row, old)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'imageId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
}