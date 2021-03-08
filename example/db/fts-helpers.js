export const stopWords = new Set([
  'the', 'be', 'to', 'of', 'and',
  'a', 'in', 'that', 'have', 'i', 
  'it', 'for', 'not', 'on', 'with',
  'he', 'as', 'you', 'do', 'at', 'if',
  'this', 'buy', 'his', 'by', 'from',
  'they', 'we', 'her', 'she', 'or', 'an',
  'will', 'my', 'would', 'there', 'their',
])
export class Intersection {
  constructor(left, right, comparator) {
    this.comparator = comparator
    this.left = left
    this.right = right
    this.value = undefined
    this.matched = false
    this.cmp = undefined
  }
  advance(c) {
    let { comparator, left, right, cmp } = this
    if (this.value === undefined) {
      if (left === null) return
      left.advance(c)
      right.advance(c)
    } else if (cmp < 0) {
      if (c !== undefined && 
        comparator(right.value, c) < 0) {
        left.advance(c)
        right.advance(c)
      } else {
        left.advance(right.value)
      }
    } else if (cmp > 0) {
      if (c !== undefined && 
        comparator(left.value, c) < 0) {
        left.advance(c)
        right.advance(c)
      } else {
        right.advance(left.value)
      }
    } else {
      left.advance(c)
      right.advance(c)      
    }
    if (left.value !== undefined && right.value !== undefined) {
      this.cmp = cmp = comparator(left.value, right.value)
      this.value = cmp < 0 ? left.value : right.value   
      this.matched = cmp === 0 && left.matched && right.matched
    } else {
      this.left = null
      this.right = null
      this.value = undefined
      this.matched = false
    }
  }
}
export class Union {
  constructor(left, right, comparator) {
    this.comparator = comparator
    this.left = left
    this.right = right
    this.value = undefined
    this.matched = false
    this.cmp = undefined
  }
  advance(c) {
    let { comparator, left, right, cmp } = this
    if (this.value === undefined) {
      if (left === null) return
      left.advance(c)
      right.advance(c)
    } else if (right === null) {
      left.advance(c)
      this.value = left.value
      this.matched = left.matched
      if (this.value === undefined) this.left = null
      return
    } else if (cmp < 0) {
      left.advance(c)
      if (c !== undefined && 
        comparator(right.value, c) < 0) {
        right.advance(c)
      }
    } else if (cmp > 0) {
      right.advance(c)
      if (c !== undefined && 
        comparator(left.value, c) < 0) {
        left.advance(c)
      }
    } else {
      left.advance(c)
      right.advance(c)      
    }
    if (left.value !== undefined && right.value !== undefined) {
      this.cmp = cmp = comparator(left.value, right.value)
      this.value = cmp > 0 ? right.value : left.value
      this.matched = cmp > 0 ? right.matched : left.matched || 
        cmp === 0 && right.matched
    } else {
      if (right.value !== undefined) {
        this.left = left = right
      } else {
        if (left.value === undefined) this.left = null
      } 
      this.right = null
      this.value = left.value
      this.matched = left.matched
    }
  }
}
export class Occurences {
  constructor(index, start, end, comparator, runLength = 20) {
    this.runLength = runLength
    this.index = index
    this.start = start
    this.end = end
    this.comparator = comparator
    this.value = undefined
    this.matched = false
    this.rator = index.enumerate(start, end)
  }
  advance(c) {
    let { rator, comparator, runLength } = this
    let attempts = 0
    while (++attempts < runLength) {
      let a = rator.nextValue()
      if (c === undefined || 
        a === undefined ||
        comparator(a, c) >= 0) {
          this.value = a
          this.matched = a !== undefined
          return
        }
    }
    let { index, start, end } = this
    let r = index.findRange(a => comparator(a, c), 'start', start, end)
    this.rator = index.enumerate(r.start, end) 
    this.value = this.rator.nextValue()
    this.matched = this.value !== undefined
  }
}
export function* sentencesRanges(text) {
  let start = 0
  let m
  let re = /[?.!]+/g
  while (m = re.exec(text)) {
    yield { start, end: m.index }
    start = m.index + m[0].length
  }
  yield { start, end: text.length }
}
export function getWords(sentence) {
  let matches = normalize(sentence).match(/\p{L}{2,}/gu)
  if (matches) return matches.filter(word => !stopWords.has(word))
  return []
}
export function normalize(text) {
  return text.toLocaleLowerCase()
}
