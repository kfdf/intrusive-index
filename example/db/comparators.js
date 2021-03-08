/*
localeCompare with extra arguments 
(locale/options) seems to be hideosly slow...
*/
/**
@param {string} a
@param {string} b */
export function compareStringsOrdinal(a, b) {
  if (a == null) return b == null ? 0 : -1
  if (b == null) return 1
  return a < b ? -1 : a > b ? 1 : 0
}
/**
@param {string} a
@param {string} b */
export function compareStrings(a, b) {
  if (a == null) return b == null ? 0 : -1
  if (b == null) return 1
  return a < b ? -1 : a > b ? 1 : 0
}
/**
@param {string} a
@param {string} b */
export function compareStringsIgnoreCase(a, b) {
  if (a == null) return b == null ? 0 : -1
  if (b == null) return 1
  a = a.toLocaleLowerCase()
  b = b.toLocaleLowerCase()
  return a < b ? -1 : a > b ? 1 : 0
}
/**
@param {Date} a
@param {Date} b */
export function compareDates(a, b) {
  if (a == null) return b == null ? 0 : -1
  else if (b == null) return 1
  return a.getTime() - b.getTime()
}
