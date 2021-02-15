import { IIA, IIB } from '../intrusive-index.js'
import { compareStringsIgnoreCase } from '../comparators.js'
import { addRow, deleteRow, enumerateSafely, getDeleted, getReplaced, replaceRow } from '../dml-helpers.js'
import * as db from '../index.js'
import { numberType, stringType } from '../type-hints.js'

export function Row({ 
  speciesId = numberType, 
  name = stringType
} = {}) {
  this.speciesId = speciesId
  this.name = name
  this[IIA.l] = this[IIB.l] = null
  this[IIA.r] = this[IIB.r] = null
  this[IIA.d] = this[IIB.d] = -1
}
export const keyLength = 1
export const fileName = 'species'

/**
@template K
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Pick<Row, K>>} SpeciesIndex */

/** @type {SpeciesIndex<'speciesId'>} */
export const pk = new IIA((a, b) => 
  a.speciesId - b.speciesId)

/** @type {SpeciesIndex<'name'>} */
export const nameUx = new IIB((a, b) => 
  compareStringsIgnoreCase(a.name, b.name))

/**
@param {db.Transaction} tr 
@param {Omit<Row, 'speciesId'>} values */
export function create(tr, { name }) {
  let speciesId = tr.nextId()
  let row = new Row({ speciesId, name })
  addRow(tr, nameUx, row)
  addRow(tr, pk, row, true)
  return row
}
/**
@param {db.Transaction} tr 
@param {Row} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  replaceRow(tr, nameUx, row, old)
  return row
}
/**
@param {db.Transaction} tr 
@param {Pick<Row, 'speciesId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  deleteRow(tr, nameUx, row, true)
  db.character.speciesFk
    .into(enumerateSafely(a => pk.comp(a, row)))
    .forEach(({ characterId }) => {
      db.character.update(tr, { characterId, speciesId: null })
    })
}

