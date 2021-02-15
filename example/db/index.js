import * as tables from './tables/index.js'
import * as images from './views/images.js'
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
        let { keyLength } = table
        let inserted = inserts[i]
        let removed = removals[i]
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
let tr = new Transaction()
try {
  for (let imageId of imageList) {
    images.create(tr, { imageId, locked: false })
  }
} catch (err) {
  console.log(err)
  process.exit()
}
