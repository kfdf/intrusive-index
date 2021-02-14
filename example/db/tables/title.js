import { IIA, IIB, IIC, IID } from 'intrusive-index'
import { compareStringsIgnoreCase } from '../comparators.js'
import { createMerger, addRow, deleteRow, getReplaced, replaceRow, getDeleted, verifyFk } from '../dml-helpers.js'
import { nullableNumberType, numberType, stringType } from '../type-hints.js'
import * as db from '../index.js'

export function Row({ 
  titleId = numberType, 
  characterId = numberType, 
  gameId = nullableNumberType, 
  name = stringType
} = {}) {
  this.titleId = titleId
  this.characterId = characterId
  this.gameId = gameId
  this.name = name
  this[IIA.l] = this[IIB.l] = this[IIC.l] = this[IID.l] = null
  this[IIA.r] = this[IIB.r] = this[IIC.r] = this[IID.r] = null
  this[IIA.d] = this[IIB.d] = this[IIC.d] = this[IID.d] = -1
}
export const keyLength = 1
export const fileName = 'titles'
const mergeInto = createMerger(new Row(), keyLength)

/**
@param {Pick<Row, 'name'>} a
@param {Pick<Row, 'name'>} b */
export function nameComp(a, b) {
  return compareStringsIgnoreCase(a.name, b.name)
}
/**
@template K
@typedef {import('intrusive-index').IntrusiveIndex<Row, Pick<Row, K>>} TitleIndex */

/** @type {TitleIndex<'titleId'>} */
export const pk = new IIA((a, b) => 
  a.titleId - b.titleId)

/** @type {TitleIndex<'titleId' | 'name' | 'characterId'>} */
export const charNameIx = new IIB((a, b) => 
  db.character.pk.comp(a, b) ||
  nameComp(a, b) ||
  pk.comp(a, b))

/** @type {TitleIndex<'titleId' | 'gameId' | 'characterId'>} */
export const charGameIx = new IIC((a, b) => 
  db.character.pk.comp(a, b) ||
  db.game.pk.comp(a, b) ||
  pk.comp(a, b))

/** @type {TitleIndex<'titleId' | 'gameId'>} */
export const gameFk = new IID((a, b) => 
  db.game.pk.comp(a, b) ||
  pk.comp(a, b))

/**
@param {db.Transaction} tr
@param {Omit<Row, 'titleId' | 'gameId'>} values */
export function create(tr, { characterId, name }) {
  let titleId = tr.nextId()
  let row = new Row({ 
    titleId, gameId: null, characterId, name,
  })
  verifyFk(db.character.pk, row)
  addRow(tr, pk, row, true)
  addRow(tr, charNameIx, row, true)
  addRow(tr, charGameIx, row, true)
  addRow(tr, gameFk, row, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'titleId'> & Partial<Row>} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  mergeInto(row, old)
  verifyFk(db.character.pk, row, old)
  if (row.gameId) verifyFk(db.game.pk, row, old)
  replaceRow(tr, charNameIx, row, old, true)
  replaceRow(tr, charGameIx, row, old, true)
  replaceRow(tr, gameFk, row, old, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'titleId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, charNameIx, row, true)
  deleteRow(tr, charGameIx, row, true)
  deleteRow(tr, gameFk, row, true)
}
