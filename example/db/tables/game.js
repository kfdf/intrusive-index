import { IIA, IIB, IIC } from 'intrusive-index'
import { createMerger, addRow, deleteRow, getReplaced, replaceRow, getDeleted, verifyFk, enumerateSafely } from '../dml-helpers.js'
import * as db from '../index.js'
import { numberType, stringType, dateType, nullableStringType } from '../type-hints.js'
import { verifyUnlocked } from '../views/images.js'

export function Row({ 
  gameId = numberType, 
  name = stringType, 
  shortName = stringType, 
  date = dateType, 
  description = stringType, 
  imageId = nullableStringType
} = {}) {
  this.gameId = gameId
  this.name = name
  this.shortName = shortName
  this.date = date
  this.description = description
  this.imageId = imageId
  this[IIA.l] = this[IIB.l] = this[IIC.l] = null
  this[IIA.r] = this[IIB.r] = this[IIC.r] = null
  this[IIA.d] = this[IIB.d] = this[IIC.d] = -1
}

export const keyLength = 1
export const fileName = 'games'
const mergeInto = createMerger(new Row(), keyLength)
/**
@template K
@typedef {import('intrusive-index').IntrusiveIndex<Row, Pick<Row, K>>} GameIndex<K> */

/** @type {GameIndex<'gameId'>} */
export const pk = new IIA((a, b) => 
  a.gameId - b.gameId)

/** @type {GameIndex<'gameId' | 'imageId'>} */
export const imageFk = new IIB((a, b) => 
  db.image.pk.comp(a, b) ||
  pk.comp(a, b))
/** @type {GameIndex<'gameId' | 'date'>} */
export const dateIx = new IIC((a, b) => 
  +a.date - +b.date ||
  pk.comp(a, b))
/**
@param {db.Transaction} tr 
@param {Omit<Row, 'gameId' | 'image'>} values */
export function create(tr, { name, shortName, date, description }) {
  let gameId = tr.nextId()
  let row = new Row({ 
    gameId, name, shortName, date, description, 
    imageId: null 
  })
  addRow(tr, pk, row, true)
  addRow(tr, imageFk, row, true)
  addRow(tr, dateIx, row, true)
  return row
}

/**
@param {db.Transaction} tr 
@param {Pick<Row, 'gameId'> & Partial<Row>} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  mergeInto(row, old)
  if (row.imageId) {
    let image = verifyFk(db.image.pk, row, old)
    if (image) verifyUnlocked(image)
  }
  replaceRow(tr, imageFk, row, old, true)
  replaceRow(tr, dateIx, row, old, true)
  // if (row.imageId !== old.imageId) {
  //   db.image.incRef(tr, row.imageId)
  //   db.image.decRef(tr, old.imageId)
  // }
  return row
}
/**
@param {db.Transaction} tr 
@param {Pick<Row, 'gameId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  db.appearance.gameFk
    .into(enumerateSafely(a => pk.comp(a, row)))
    .forEach(a => db.appearance.remove(tr, a))
  db.title.gameFk
    .into(enumerateSafely(a => pk.comp(a, row)))
    .forEach(({ titleId }) => {
      db.title.update(tr, { titleId, gameId: null })
    })
  deleteRow(tr, imageFk, row, true)
  deleteRow(tr, dateIx, row, true)
  // db.image.decRef(tr, row.imageId)
}
