import { IIA, IIB } from '../intrusive-index.js'
import { deleteRow, getDeleted, replaceRow, verifyFk } from '../dml-helpers.js'
import * as db from '../index.js'
import { numberType } from '../type-hints.js'

export function Row({
  locationId = numberType,
  gameId = numberType,
} = {}) {
  this.locationId = locationId
  this.gameId = gameId
  this[IIA.l] = this[IIB.l] = null
  this[IIA.r] = this[IIB.r] = null
  this[IIA.d] = this[IIB.d] = -1
}

/*
because this table column count equals to the primary 
key column count, there is no way to discern between 
creation and deletion records when loading the data, 
so keyLength is set to three to make deletion records 
longer. Slightly hackish way but it works */
export const keyLength = 3
export const fileName = 'settings'

/**
@template K
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Pick<Row, K>>} SettingIndex<K> */

/** @type {SettingIndex<'locationId' | 'gameId'>} */
export const pk = new IIA((a, b) => 
  a.locationId - b.locationId ||
  a.gameId - b.gameId)

/** @type {SettingIndex<'locationId' | 'gameId'>} */
export const gameFk = new IIB((a, b) => 
  a.gameId - b.gameId ||
  a.locationId - b.locationId)

/**
@param {db.Transaction} tr
@param {Row} values */
export function upsert(tr, values) {
  let row = new Row(values)
  let old = tr.insert(pk, row)
  let game = verifyFk(db.game.pk, row, old)
  let location = verifyFk(db.location.pk, row, old)
  db.settingDen.upsert(tr, { game, location })
  replaceRow(tr, gameFk, row, old, true)
  return row
}
/**
@param {db.Transaction} tr
@param {Row} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  db.settingDen.remove(tr, { game: row, location: row })
  deleteRow(tr, gameFk, row, true)
}
