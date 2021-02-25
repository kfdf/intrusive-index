import * as tables from './tables/index.js'
import * as views from './views/index.js'
import { loadTable, addToSaveQueue, listImages } from './storage.js'
import { TransactionBase, IIA, IIB, IIC, IID, IIE, IIF } from './intrusive-index.js'
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
for (let [name, table] of Object.entries(tables)) {
  if (table.keyLength != 1) continue
  let topRow = table.pk.getAt(table.pk.size - 1)
  if (topRow == null) continue
  topId = Math.max(topId, topRow[name + 'Id'])
}

export function* transaction(tr) {
  if (tr) {
    tr.savepoint()
  } else {
    tr = new Transaction()
  }
  let commited = false
  try {
    yield tr
    tr.commit()
    commited = true
  } finally {
    if (commited) return
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
The views is not persisted, so when the data is loaded
they have to be created manually, not ideal...
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
} catch (err) {
  console.log(err)
  process.exit()
}
