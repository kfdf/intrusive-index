import { IIA, IIB } from '../intrusive-index.js'
import * as db from '../index.js'
import { compareStringsIgnoreCase } from '../comparators.js'
import { addRow, deleteRow, batches, getDeleted, getReplaced, replaceRow } from '../dml-helpers.js'
import { numberType, stringType } from '../type-hints.js'
import { updateInvertedIndex } from '../views/inv-index.js'

export function Row({ 
  locationId = numberType, 
  name = stringType, 
  description = stringType
} = {}) {
  this.locationId = locationId
  this.name = name
  this.description = description
  this[IIA.l] = this[IIB.l] = null
  this[IIA.r] = this[IIB.r] = null
  this[IIA.d] = this[IIB.d] = -1
}
export const keyLength = 1
export const fileName = 'locations'

/**
@template K
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Pick<Row, K>>} LocationIndex */

/** @type {LocationIndex<'locationId'>} */
export const pk = new IIA((a, b) => 
  a.locationId - b.locationId)

/** @type {LocationIndex<'name'>} */
export const nameUx = new IIB((a, b) => 
  compareStringsIgnoreCase(a.name, b.name))

/** 
@param {db.Transaction} tr
@param {Omit<Row, 'locationId'>} values */
export function create(tr, { name, description }) {
  let locationId = tr.nextId()
  let row = new Row({ locationId, name, description })
  addRow(tr, nameUx, row)
  addRow(tr, pk, row, true)
  updateInvertedIndex(tr, 'loc', 
    row.locationId, null, row.description)
  return row
}

/** 
@param {db.Transaction} tr
@param {Row} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  replaceRow(tr, nameUx, row, old)
  db.settingDen.updateLocation(tr, row)
  updateInvertedIndex(tr, 'loc', 
    row.locationId, old.description, row.description)
  return row
}

/** 
@param {db.Transaction} tr
@param {Pick<Row, 'locationId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, nameUx, row, true)
  db.character.locationFk
    .into(batches(a => pk.comp(a, row)))
    .forEach(({ characterId }) => {
      db.character.update(tr, { characterId, locationId: null })
    })
  db.setting.pk
    .into(batches(a => pk.comp(a, row)))
    .forEach(s => db.setting.remove(tr, s))
  updateInvertedIndex(tr, 'loc', 
    row.locationId, row.description, null)
}
