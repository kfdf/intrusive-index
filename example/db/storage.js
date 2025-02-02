import { createReadStream } from 'fs'
import { appendFile, readdir } from 'fs/promises'
import { join } from 'path'
import { dataFolder } from '../config.js'

export function listImages() {
  return readdir(join(dataFolder, 'images'))
}
export async function* readLines(file) {
  let tail = ''
  let stream = createReadStream(file, 'utf-8')
  for await (let chunk of stream) {
    let lines = chunk.split('\n')
    lines[0] = tail + lines[0]
    tail = lines.pop()
    yield lines
  }
  if (tail) throw 'Expected a new line at the end of ' + file
}
function deserializeValue(value) {
  if (typeof value !== 'string' ||
    !value.startsWith('#')) return value
  if (value.length === 1) return undefined
  value = value.slice(1)
  if (value.startsWith('#')) return value
  return new Date(Date.parse(value + 'T00:00Z'))
}

export function serializeValue(value) {
  if (value === undefined) {
    return '#'
  } else if (typeof value === 'string') {
    if (value.startsWith('#')) value = '#' + value
    return value
  } else if (value instanceof Date) {
    return '#' + value.toISOString().slice(0, 10)
  }
  return value
}
/*
The data for a table is stored in a separate file, it is typed,
uses "undefined" (encoded as '#') values to denote holes in 
"update" rows, and value count of a row indicates whether it's
an insert or delete row.
I think I would prefer all the data to be in the same file with 
every row prefixed with all the relevant data (which table, 
what operation, which fields are updated). And untyped, so that
deserialization is performed by tables themselves, perhaps
even in Row constructors. But it is what it is...
*/
export async function loadTable({ Row, pk, keyLength, fileName, ...rest}) {
  let indexes = Object.values(rest)
    .filter(v => v.constructor.name === 'IntrusiveIndex')
  let rowNumber = 0
  try {
    let tableFile = join(dataFolder, fileName + '.csv')
    for await (let batch of readLines(tableFile)) {
      for (let line of batch) {
        rowNumber++
        let values = JSON.parse(`[${line}]`)
        let row = new Row()
        let i = 0
        // recods that are keyLength long are used to delete rows
        if (values.length === keyLength) {
          for (let prop in row) {
            row[prop] = deserializeValue(values[i++])
            if (i == keyLength) break
          }          
          pk.delete(row)
        } else {
          let old = null
          for (let prop in row) {
            let value = deserializeValue(values[i++])
            row[prop] = value === undefined ? old[prop] : value
            if (i == keyLength) old = pk.insert(row)
          }
          // keyLength can be larger than column count,
          // small hack to handle situation when the primary 
          // key columns span the entire table
          if (i < keyLength) pk.insert(row)
        }
      }
    }
  } catch (err) {
    err.rowNumber = rowNumber
    throw err
  }   

  for (let row of pk.enumerate()) {
    for (let i = 0; i < indexes.length; i++) {
      if (!indexes[i].add(row)) throw {
        message: `failed to add a row"`,
        fileName, indexNumber: i, row
      }
    }
  } 
}
let cooldown = false
let queues = new Map()
let lastUpdated = Date.now()

export function addToSaveQueue(fileName, values) {
  let rows = queues.get(fileName)
  if (!rows) queues.set(fileName, rows = [])
  rows.push(values)
  if (cooldown) return
  cooldown = true
  saveData()
}

// we assume this method never fails
async function saveData() {
  await 0
  while (queues.size) {
    let batch = queues
    queues = new Map() 
    for (let [fileName, rows] of batch) {
      let path = join(dataFolder, fileName + '.csv')
      let data = ''
      for (let row of rows) {
        for (let i = 0; i < row.length; i++) {
          row[i] = serializeValue(row[i])
        }
        data += JSON.stringify(row).slice(1, -1) + '\r\n'
      }
      await appendFile(path, data)
    }
    let updateTime = Date.now()
    let delay = 1000 - (updateTime - lastUpdated)
    lastUpdated = updateTime
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay))
      lastUpdated += delay
    }
    cooldown = false
  }
}
