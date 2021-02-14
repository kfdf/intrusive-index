import { IIA, IIB } from 'intrusive-index'
import { addRow, deleteRow, getDeleted, getReplaced, replaceRow, verifyFk } from '../dml-helpers.js'
import { numberType, stringType } from '../type-hints.js'
import * as db from '../index.js'

export function Row({ 
  characterId = numberType, 
  gameId = numberType, 
  order = numberType,
  description = stringType 
} = {}) {
  this.characterId = characterId
  this.gameId = gameId
  this.order = order
  this.description = description
  this[IIA.l] = this[IIB.l] = null
  this[IIA.r] = this[IIB.r] = null
  this[IIA.d] = this[IIB.d] = -1
}
export const keyLength = 2
export const fileName = 'appearances'
/**
@template K
@typedef {import('intrusive-index').IntrusiveIndex<Row, Pick<Row, K>>} AppearanceIndex<K> */

/** @type {AppearanceIndex<'characterId' | 'gameId'>} */
export const pk = new IIA((a, b) => 
  db.character.pk.comp(a, b) ||
  db.game.pk.comp(a, b))

/** @type {AppearanceIndex<'characterId' | 'gameId'>} */
export const gameFk = new IIB((a, b) => 
  db.game.pk.comp(a, b) ||
  db.character.pk.comp(a, b))

/**
@param {db.Transaction} tr
@param {Row} values */
export function create(tr, values) {
  let row = new Row(values)
  verifyFk(db.character.pk, row)
  verifyFk(db.game.pk, row)
  addRow(tr, pk, row)
  addRow(tr, gameFk, row, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Row} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  replaceRow(tr, gameFk, row, old, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'gameId' | 'characterId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, gameFk, row, true)
}