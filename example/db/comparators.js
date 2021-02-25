/**
@param {string} a
@param {string} b */
export function compareStrings(a, b) {
  if (a == null) return b == null ? 0 : -1
  else if (b == null) return 1
  else return a.localeCompare(b, 'en')
}
/**
@param {string} a
@param {string} b */
export function compareStringsIgnoreCase(a, b) {
  if (a == null) return b == null ? 0 : -1
  else if (b == null) return 1
  else return a.localeCompare(b, 'en', { sensitivity: 'base' })
}
