import { IIA, IIB, IIC, IID } from '../intrusive-index.js'
import * as db from '../index.js'
import { deleteRow, getDeleted, replaceRow } from '../dml-helpers.js'

function Row({
  location = /** @type {db.location.Row} */(null), 
  game = /** @type {db.game.Row} */(null),
} = {}) {
  this.location = location
  this.game = game
  this[IIA.l] = this[IIB.l] = this[IIC.l] = this[IID.l] = null
  this[IIA.r] = this[IIB.r] = this[IIC.r] = this[IID.r] = null
  this[IIA.d] = this[IIB.d] = this[IIC.d] = this[IID.d] = -1
}
/**
@typedef RowKey
@property {Pick<db.location.Row, 'locationId'>} location
@property {Pick<db.game.Row, 'gameId'} game */

/**
@template T
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, T>} SettingDenIndex<T> */

/** @type {SettingDenIndex<RowKey>} */
export const pk = new IIA((a, b) => 
  db.location.pk.comp(a.location, b.location) ||
  db.game.pk.comp(a.game, b.game))

/** @type {SettingDenIndex<RowKey>} */
export const gameFk = new IID((a, b) => 
  db.game.pk.comp(a.game, b.game) ||
  db.location.pk.comp(a.location, b.location))

/** @type {SettingDenIndex<Row>} */
export const gameLocationNameIx = new IIB((a, b) =>
  db.game.pk.comp(a.game, b.game) ||
  db.location.nameUx.comp(a.location, b.location) ||
  pk.comp(a, b))

/** @type {SettingDenIndex<Row>} */
export const locGameDateIx = new IIC((a, b) =>
  db.location.pk.comp(a.location, b.location) ||
  db.game.dateIx.comp(a.game, b.game) ||
  pk.comp(a, b))

/** @param {db.game.Row} game */
export function updateGame(tr, game) {
  gameFk.enumerate(a => db.game.pk.comp(a.game, game))
    .forEach(({ location }) => upsert(tr, { game, location }))
}
/** @param {db.location.Row} location */
export function updateLocation(tr, location) {
  pk.enumerate(a => db.location.pk.comp(a.location, location))
    .forEach(({ game }) => upsert(tr, { game, location }))
}
/** @param {Row} values */
export function upsert(tr, values) {
  let row = new Row(values)
  let old = tr.insert(pk, row)
  replaceRow(tr, gameFk, row, old, true)
  replaceRow(tr, locGameDateIx, row, old, true)
  replaceRow(tr, gameLocationNameIx, row, old, true)
}
/** @param {RowKey} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, gameFk, row, true)
  deleteRow(tr, locGameDateIx, row, true)
  deleteRow(tr, gameLocationNameIx, row, true)
}
