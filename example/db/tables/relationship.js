import { IIA } from 'intrusive-index'
import { addRow, getDeleted, getReplaced, verifyFk, verifyFkComp } from '../dml-helpers.js'
import { numberType, stringType } from '../type-hints.js'
import * as db from '../index.js'

export function Row({ 
  characterId = numberType, 
  otherCharacterId = numberType, 
  description = stringType 
} = {}) {
  this.characterId = characterId
  this.otherCharacterId = otherCharacterId
  this.description = description
  this[IIA.l] = null
  this[IIA.r] = null
  this[IIA.d] = -1
}
export const keyLength = 2
export const fileName = 'relationships'

/**
@template K
@typedef {import('intrusive-index').IntrusiveIndex<Row, Pick<Row, K>>} RelationshipIndex<K> */

/** @type {RelationshipIndex<'characterId' | 'otherCharacterId'>} */
export const pk = new IIA((a, b) => 
  db.character.pk.comp(a, b) ||
  a.otherCharacterId - b.otherCharacterId)

/**
@param {db.Transaction} tr 
@param {Row} values */
export function create(tr, values) {
  let row = new Row(values)
  verifyFk(db.character.pk, row)
  verifyFkComp(db.character.pk, a => a.characterId - row.otherCharacterId)
  addRow(tr, pk, row)
  return row
}
/**
@param {db.Transaction} tr 
@param {Row} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  return row
}
/**
@param {db.Transaction} tr 
@param {Pick<Row, 'characterId' | 'otherCharacterId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
}