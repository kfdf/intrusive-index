import { DbError } from '../../db/dml-helpers.js'
import { Validator } from './validation.js'
import * as db from '../../db/index.js'
/** 
@param {string} str */
export function htmlEscape(str) {
  return str
    .replace('&', '&amp;')
    .replace('<', '&lt;')
    .replace('>', '&gt;')
    .replace('"', '&quot;')
}

export function formatDate(date) {
  if (date == null) {
    return ''
  } else if (typeof date === 'string') {
    return date
  } else {
    return date.toISOString().slice(0, 10)
  }
}
export function validate(req, res) {
  res.locals.values = {}
  res.locals.errors = {}
  return new Validator(req.body, res.locals.values, res.locals.errors)
}

export function catchRerender(err, req, res, next) {
  next(err !== 'rerender' && err)
}
export function handleDbErrors(err, req, res, next) {
  if (!(err instanceof DbError)) throw err
  switch (err.details.reason) {
    case 'fk':
      switch (err.details.index) {
        case db.location.pk: throw 'The location is gone'
        case db.image.pk: throw 'The image is gone'
        case db.species.pk: throw 'The species is gone'
        case db.character.pk: throw 'The character is gone'
        case db.game.pk: throw 'The game is gone'
        default: 
          console.log(err)
          throw 'Foreign key constraint violation'
      }
    case 'locked':
      switch (err.details.index) {
        case db.image.pk: throw 'The image is locked'
        default: 
          console.log(err)
          throw 'The item is locked'
      }
    case 'restricted':
      switch (err.details.index) {
        case db.image.pk: throw 'The image is in use'
        default: 
          console.log(err)
          throw 'The item is in use'
      }      
    case 'requested': 
      switch (err.details.index) {
        case db.appearance.pk: 
        case db.character.pk:
        case db.game.pk:
        case db.location.pk:
        case db.relationship.pk:
        case db.setting.pk:
        case db.species.pk:
        case db.title.pk:
        case db.image.pk: 
          if (err.details.operation != 'add') throw 'route'
          throw 'An item with such Id already exists'
        case db.character.nameUx:
          // forms map to tables so it's ok to do it here
          res.locals.errors.name = 'A character with such name already exists'
          throw `rerender`
        case db.species.nameUx:
          res.locals.errors.name = 'A species with such name already exists'
          throw `rerender`
        case db.location.nameUx:
          res.locals.errors.name = 'A location with such name already exists'
          throw `rerender`
        default: 
          console.log(err)
          throw 'Constraint violation'
      }
    default: 
      console.log(err)
      throw 'A database error'
  }
}