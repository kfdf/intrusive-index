import { compareStringsOrdinal } from '../comparators.js'
import { getWords, Intersection, Occurences, sentencesRanges, Union } from '../fts-helpers.js'
import * as db from '../index.js'
import { createFactory } from '../intrusive-index.js'
import { segmentRanges, zip } from '../query-helpers.js'
import { numberType, stringType } from '../type-hints.js'
import { Sequence } from '../../../index.js'

/* improves performance up to 50% */
let IIA = createFactory()()

export function Row({ 
  word = stringType, 
  type = /** @type {EntryType} */(undefined), 
  id = numberType, 
  pos = numberType,
  sentenceStart = numberType,
  sentenceEnd = numberType
}) {
  this.word = word
/*
This table has the potential to grow quite 
large, so using so many fields to specify the 
match position is quite excessive. But simple.
*/
  this.type = type
  this.id = id
  this.pos = pos
  this.sentenceStart = sentenceStart
  this.sentenceEnd = sentenceEnd
  this[IIA.l] = null
  this[IIA.r] = null
  this[IIA.d] = null
}
/**
@typedef {import('../intrusive-index.js').IntrusiveIndex<Row, Row>} InvIndex*/
/**
@typedef {Pick<Row, 'type' | 'id' | 'pos'>} WordPosition */
/**
@typedef {'game' | 'loc' | 'char'} EntryType */

/** 
@param {WordPosition} a 
@param {WordPosition} b  */
export function comparePosition(a, b) {
  return compareStringsOrdinal(a.type, b.type) ||
    a.id - b.id ||
    a.pos - b.pos
}

/** @type {import('../intrusive-index.js').IntrusiveIndex<Row, Row>}  */
export const invIndex = new IIA((a, b) => 
  compareStringsOrdinal(a.word, b.word) ||
  comparePosition(a, b))

/**
@param {db.Transaction} tr
@param {Row} values */
export function upsert(tr, values) {
  let row = new Row(values)
  // The table itself is used for string interning, so 
  // there's no need to keep a separate table for words
  let any = invIndex.get(a => compareStringsOrdinal(a.word, values.word))
  if (any != null) values.word = any.word
  let old = tr.insert(invIndex, row)
}
/**
@param {db.Transaction} tr
@param {Pick<Row, 'word' | 'type' | 'id' | 'pos'>} key */
export function remove(tr, key) {
  tr.delete(invIndex, key)
  // it's ok to try to delete a non-existent key
  // it happens when a word occurs more than once in a sentence
  // let row = getDeleted(tr, invIndex, key)
}

/**
@param {db.Transaction} tr
@param {EntryType} type
@param {number} id
@param {string | null} oldText
@param {string | null} newText */
export function updateInvertedIndex(tr, type, id, oldText, newText) {
  if (oldText === newText) return
  if (oldText == null) oldText = ''
  if (newText == null) newText = ''
  Sequence
    .from(sentencesRanges(oldText))
    .map(r => oldText.slice(r.start, r.end))
    .into(zip(Sequence
      .from(sentencesRanges(newText))
      .map(range => {
        let { start, end } = range
        let sentence = newText.slice(start, end)
        return { start, end, sentence }
      }),
      (a, b) => ({ oldSentence: a, curr: b })))
    .map(({ oldSentence, curr }, pos) => ({ 
      oldSentence, curr, pos 
    }))
    .filter(a => a.oldSentence !== a.curr.sentence)
    .forEach(({ oldSentence, curr, pos }) => {
      if (oldSentence) {
        for (let word of getWords(oldSentence)) {
          remove(tr, { word, type, id, pos })      
        }
      }
      if (curr) {
        for (let word of getWords(curr.sentence)) {
          upsert(tr, { 
            word, type, id, pos, 
            sentenceStart: curr.start, 
            sentenceEnd: curr.end 
          })        
        }
      }
    })
}
/**
@params {string[]} prefixes
@returns {{
  tree: { 
    advance: (c?: WordPosition) => void 
    value: Row | undefined
    matched: boolean
  }
  words: string[][]
}} */
export function search(prefixes) {
  let words = []
  let tree = []
  for (let prefix of prefixes) {
    if (tree.length >= 8) break
    let r = invIndex.findRange(a => 
      a.word.startsWith(prefix) ? 0 : compareStringsOrdinal(a.word, prefix))
    let wordForms = []
    let occs = invIndex
      .into(segmentRanges((a, b) => compareStringsOrdinal(a.word, b.word), r.start, r.end))
      .take(8)
      .map(r => (wordForms.push(r.atStart.word), r))
      .map(r => new Occurences(invIndex, r.start, r.end, comparePosition))
      .toArray()
    if (occs.length == 0) break
    while (occs.length > 1) {
      // @ts-ignore
      occs.unshift(new Union(occs.pop(), occs.pop(), comparePosition))
    }  
    words.push(wordForms)
    tree.push(occs.pop())
  }
  while (tree.length > 1) {
    tree.unshift(new Intersection(tree.pop(), tree.pop(), comparePosition))
  }  
  if (tree.length == 0) {
    tree.push(new Occurences(invIndex, 0, 0, comparePosition))
  }
  return { tree: tree.pop(), words }
}
