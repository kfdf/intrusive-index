import * as tables from './tables/index.js'
import * as views from './views/index.js'
import { loadTable, addToSaveQueue, listImages } from './storage.js'
import { TransactionBase, IIA, IIB, IIC, IID, IIE, IIF, Sequence } from './intrusive-index.js'
import { getWords, sentencesRanges } from './fts-helpers.js'
export * from './tables/index.js'
export * from './views/index.js'
let pkIndex = new Map()
for (let table of Object.values(tables)) {
  // @ts-ignore
  await loadTable(table)
  pkIndex.set(table.pk, table)
}
const idPool = []
let topId = 1000
/*
If a table has an id field that is named after it,
then this field is assumed to be the auto generated 
primary key. A single id sequence provides id values
for all the tables. `IdPool` holds the id values that 
we used during cancelled transactions for later reuse.
*/
for (let [name, table] of Object.entries(tables)) {
  let idName = name + 'Id'
  let topRow = table.pk.getAt(table.pk.size - 1)
  if (topRow && idName in topRow) {
    topId = Math.max(topId, topRow[idName])
  }
}
/*
This function makes Transaction usable inside the `for of`
loop. Exiting early, by throwing, breaking or returning
causes a rollback. Unfortunately, there is no way
to adjust this behavior, for instance to make an early 
return to commit the transaction, or to shutdown if an error
is fatal, as for some reason the `for of` loops do not use 
the `throw` method of the generator, so there is no direct 
way to find out what caused the premature exit, or catch an 
error inside the body of the generator function.
Supports nested transactions, like so (not used in the example):
for (let tr of db.transaction()) {
  ...
  for (let _ of db.transaction(tr)) {
    ...
    `return` or `throw` will rollback all transactions
    `break` will rollback only the inner one
  }
}
*/
export function* transaction(tr = null) {
  if (tr) {
    tr.savepoint()
  } else {
    tr = new Transaction()
  }
  let ranToCompletion = false
  try {
    yield tr
    tr.commit()
    ranToCompletion = true
  } finally {
    if (ranToCompletion) return
    tr.rollback()
  }
}

export class Transaction extends TransactionBase {
  constructor() {
    super()
    this.idSavepoints = []
    this.ids = []
  }
  nextId() {
    let id = idPool.length ? idPool.pop() : ++topId
    this.ids.push(id)
    return id
  }
  savepoint() {
    super.savepoint()
    this.idSavepoints.push(this.ids.length)
  }
  release() {
    super.release()
    this.idSavepoints.pop()
  }
  commit() {
    if (this.journal.savepoints.length) {
      this.release()
    } else {
      let { indexes, inserts, removals } = this.journal
      for (let i = 0; i < indexes.length; i++) {
        let index = indexes[i]
        let table = pkIndex.get(index)
        if (!table) continue
        let inserted = inserts[i]
        let removed = removals[i]
        let { keyLength } = table
        verifyRow(inserted)
        verifyRow(removed)
        let values = []
        if (inserted) {
          for (let prop in inserted) {
            values.push(inserted[prop])
          }      
          if (removed) {
            let prevValues = Object.values(removed)
            for (let i = keyLength; i < values.length; i++) {
              if (prevValues[i] === values[i]) {
                values[i] = undefined
              }
            }
          }
        } else if (removed) {
          for (let prop in removed) {
            values.push(removed[prop])
            if (values.length >= keyLength) break
          }
          while (values.length < keyLength) {
            values.push(undefined)
          }
        }
        addToSaveQueue(table.fileName, values)
      }
    } 
  }
  rollback() {
    try {
      if (!super.rollback()) throw {
        message: 'Rollback failed'
      }
      let savepoint = this.idSavepoints.pop() || 0
      while (this.ids.length > savepoint) {
        idPool.push(this.ids.pop())
      }
      return true
    } catch (err) {
      console.log(err)
      process.exit()
    }
  }
}

let diffNames = [IIA.d, IIB.d, IIC.d, IID.d, IIE.d, IIF.d]
/*
Basic and relatively cheap runtime check to assert that 
either all or none of the index-injected fields are in use. 
Not very robust but catches the most common programming error: 
forgetting to add or remove a row from all indexes of a table.
*/
function verifyRow(row) {
  if (row == null) return
  let first = null
  for (let dn of diffNames) {
    let diff = row[dn]
    if (diff === undefined) break
    let detached = diff == -1
    if (first == null) first = detached
    if (first == detached) continue
    console.log(row)
    process.exit()
  }
}
// @ts-ignore
let imageList = await listImages()
/*
The views are not persisted, and when the data is loaded they 
have to be created manually. So the view logic is dublicated, 
during creating and when updating it. When it is simple it is 
not much of a problem, but, of course, not ideal either...
*/
let tr = new Transaction()
try {
  for (let imageId of imageList) {
    views.image.create(tr, { 
      imageId, locked: false, refCount: 0
    })
  }
  tables.character.imageFk
    .enumerate()
    .segment(views.image.pk.comp)
    .map(g => g.map(ch => ch.imageId))
    .concat(tables.game.imageFk
      .enumerate()
      .segment(views.image.pk.comp)
      .map(g => g.map(gm => gm.imageId)))
    .map(g => {
      let imageId = g.nextValue()
      let refCount = g.reduce((c, a) => c + 1, 1)
      return { imageId, refCount }
    })
    .filter(a => a.imageId != null)
    .forEach(a => views.image.update(tr, a))
  tables.game.pk
    .enumerate()
    .map(game => tables.setting.gameFk
      .enumerate(a => tables.game.pk.comp(a, game))
      .map(s => tables.location.pk.get(s))
      .map(location => ({ game, location })))
    .flatten()
    .forEach(a => views.settingDen.upsert(tr, a))
    
  tables.game.pk
    .enumerate()
    .map(g => {
      let id = g.gameId
      let text = g.description
      return { id, type: /** @type{'game'} */ ('game'), text }
    })
    .concat(tables.character.pk
      .enumerate()
      .map(ch => {
        let id = ch.characterId
        let text = ch.description
        return { id, type: /** @type{'char'} */ ('char'), text }
      }))
    .concat(tables.location.pk
      .enumerate()
      .map(l => {
        let id = l.locationId
        let text = l.description
        return { id, type: /** @type{'loc'} */ ('loc'), text }
      }))
    .map(({ id, type, text }) => Sequence
      .from(sentencesRanges(text))
      .map((r, pos) => Sequence
        .from(getWords(text.slice(r.start, r.end)))
        .map(word => ({ 
          id, type, word, pos, 
          sentenceStart: r.start, sentenceEnd: r.end,
        })))
      .flatten())
    .flatten()
    .forEach(a => views.invIndex.upsert(tr, a))
} catch (err) {
  console.log(err)
  process.exit()
}