import { IIA, IIB, IIC, IID, IIE } from '../intrusive-index.js'
import { compareStringsIgnoreCase } from '../comparators.js'
import { createMerger, addRow, deleteRow, getReplaced, replaceRow, getDeleted, verifyFk, batches } from '../dml-helpers.js'
import * as db from '../index.js'
import { nullableNumberType, nullableStringType, numberType, stringType } from '../type-hints.js'
import { updateInvertedIndex } from '../views/inv-index.js'

export function Row({ 
  characterId = numberType, 
  locationId = nullableNumberType, 
  speciesId = nullableNumberType, 
  name = stringType, 
  abilities = stringType, 
  age = stringType, 
  occupation = stringType, 
  description = stringType, 
  imageId = nullableStringType
} = {}) {
  this.characterId = characterId
  this.locationId = locationId
  this.speciesId = speciesId
  this.name = name
  this.abilities = abilities
  this.age = age
  this.occupation = occupation
  this.description = description
  this.imageId = imageId
  this[IIA.l] = this[IIB.l] = this[IIC.l] = this[IID.l] = this[IIE.l] = null
  this[IIA.r] = this[IIB.r] = this[IIC.r] = this[IID.r] = this[IIE.r] = null
  this[IIA.d] = this[IIB.d] = this[IIC.d] = this[IID.d] = this[IIE.d] = -1
}
export const keyLength = 1
export const fileName = 'characters'
const mergeInto = createMerger(new Row(), keyLength)
/**
@template K
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Pick<Row, K>>} CharacterIndex<K> */

/** @type {CharacterIndex<'characterId'>} */
export const pk = new IIA((a, b) => 
  a.characterId - b.characterId)

/** @type {CharacterIndex<'locationId' | 'characterId' | 'name'>} */
export const locationFk = new IIB((a, b) => 
  db.location.pk.comp(a, b) ||
  nameUx.comp(a, b) ||
  pk.comp(a, b))

/** @type {CharacterIndex<'speciesId' | 'characterId' | 'name'>} */
export const speciesFk = new IIC((a, b) => 
  db.species.pk.comp(a, b) ||
  nameUx.comp(a, b) ||
  pk.comp(a, b))

/** @type {CharacterIndex<'name'>} */
export const nameUx = new IID((a, b) => 
  compareStringsIgnoreCase(a.name, b.name))

/** @type {CharacterIndex<'characterId' | 'imageId'>} */
export const imageFk = new IIE((a, b) => 
  db.image.pk.comp(a, b) ||
  pk.comp(a, b))


/**
@param {db.Transaction} tr
@param {Omit<Row, 'characterId' | 'imageId' | 'speciesId' | 'locationId'>} values */
export function create(tr, { name, age, occupation, abilities, description }) {
  let characterId = tr.nextId()
  let row = new Row({
    characterId, name, age, occupation, abilities, description,
    speciesId: null, locationId: null, imageId: null,
  })
  addRow(tr, nameUx, row)
  addRow(tr, pk, row, true)
  addRow(tr, speciesFk, row, true)
  addRow(tr, locationFk, row, true)
  addRow(tr, imageFk, row, true)
  updateInvertedIndex(tr, 'char', 
    row.characterId, null, row.description)
  return row
}

/**
@param {db.Transaction} tr
@param {Pick<Row, 'characterId'> & Partial<Row>} values */
export function update(tr, values) {
  let row = new Row(values)
  let old = getReplaced(tr, pk, row)
  mergeInto(row, old)
  if (row.imageId) {
    let image = verifyFk(db.image.pk, row, old)
    if (image) db.image.verifyUnlocked(image)
  }
  db.image.updateRefCounts(tr, row, old)
  if (row.locationId) verifyFk(db.location.pk, row, old)
  if (row.speciesId) verifyFk(db.species.pk, row, old)
  replaceRow(tr, nameUx, row, old)
  replaceRow(tr, speciesFk, row, old, true)
  replaceRow(tr, locationFk, row, old, true)
  replaceRow(tr, imageFk, row, old, true)
  updateInvertedIndex(tr, 'char', 
    row.characterId, old.description, row.description)
  return row
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'characterId'>} key */
export function remove(tr, key) {
  let row = getDeleted(tr, pk, key)
  db.image.updateRefCounts(tr, null, row)
  db.title.charGameIx
    .into(batches(a => pk.comp(a, row)))
    .forEach(a => db.title.remove(tr, a))
  db.appearance.pk
    .into(batches(a => pk.comp(a, row)))
    .forEach(a => db.appearance.remove(tr, a))
  db.relationship.pk
    .into(batches(a => pk.comp(a, row)))
    .forEach(a => db.relationship.remove(tr, a))
  db.relationship.pk
    .into(batches(a => a.otherCharacterId - row.characterId))
    .forEach(a => db.relationship.remove(tr, a))
  deleteRow(tr, speciesFk, row, true)
  deleteRow(tr, locationFk, row, true)
  deleteRow(tr, imageFk, row, true)
  deleteRow(tr, nameUx, row, true)
  updateInvertedIndex(tr, 'char', 
    row.characterId, row.description, null)
}

