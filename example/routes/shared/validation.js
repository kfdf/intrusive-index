import assert from 'assert'
import { htmlEscape } from './helpers.js'

export class Validator {
  constructor(source, target, errors) {
    /** @private */
    this.source = source
    /** @private */
    this.target = target
    /** @private */
    this.errors = errors
  }
  /** @private */
  getValue(prop) {
    let { source, target } = this
    let value = source[prop]
    if (value === undefined) value = ''
    assert(typeof value === 'string')
    value = value.trim()
    target[prop] = value
    return value
  }
  /**
  @param {string | number} prop
  @param {string} name */
  string(prop, name, {
    minLength = 0,
    maxLength = 0,
    isAlphanum = false,
    capitalize = false,
    escape = true,
    emptyIsNull = false
  } = {}) {
    let { target, errors } = this
    let value = this.getValue(prop)
    if (capitalize) {
      value = value.slice(0, 1).toUpperCase() + value.slice(1)
    }  
    if (escape) {
      value = htmlEscape(value)
    }
    if (emptyIsNull && value.length === 0) {
      target[prop] = null
    } else {
      target[prop] = value
    }
    if (minLength && value.length < minLength) {
      if (value.length > 0) {
        errors[prop] = name + ' is too short'
      } else {
        errors[prop] = name + ' is required'
      }
    }
    if (maxLength && value.length > maxLength) {
      errors[prop] = name + ' is too long'
    }
    if (isAlphanum && /[^\p{L}]/u.test(value)) {
      errors[prop] = name + ' has non-letter characters'
    }
    return this
  }
  /**
  @param {string | number} prop
  @param {string} name */
  date(prop, name, { 
    required = true
  } = {}) {
    let { target, errors } = this
    let value = this.getValue(prop)
    if (!value) {
      if (required) {
        errors[prop] = name + ' is required'
      } else {
        target[prop] = null
      }
    } else {
      let timestamp = Date.parse(value + 'T00:00Z')
      if (isNaN(timestamp)) {
        errors[prop] = name + ' is not a valid date'
      } else {
        target[prop] = new Date(timestamp)
      }
    }
    return this
  }
  /**
  @param {string | number} prop
  @param {string} name */
  number(prop, name, {
    required = true,
    integer = false,
  } = {}) {
    let { target, errors } = this
    let value = this.getValue(prop)
    if (!value) {
      target[prop] = null
      if (required) {
        errors[prop] = name + ' is required'
      }
    } else {
      let number = Number(value)
      if (isNaN(number)) {
        errors[prop] = name + ' is not a valid number'
      } else {
        if (integer && !Number.isSafeInteger(number)) {
          errors[prop] = name + ' is not a valid integer'
        } else {
          target[prop] = number
        }
      }
    }
    return this
  }
}
