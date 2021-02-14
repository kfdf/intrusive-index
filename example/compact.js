import { once } from 'events'
import { createWriteStream } from 'fs'
import { rename, mkdir } from 'fs/promises'
import { join } from 'path'
import { dataFolder } from './config.js'
import { serializeValue } from './db/storage.js'
import './db/index.js'
import * as tables from './db/tables/index.js'

async function compact() {
  let bakFolder = join(dataFolder, 'bak')
  await mkdir(bakFolder, { recursive: true })
  for (let { fileName } of Object.values(tables)) {
    await rename(
      join(dataFolder, fileName + '.csv'), 
      join(bakFolder, fileName + '.csv'))
  }
  for (let { pk, fileName } of Object.values(tables)) {
    let path = join(dataFolder, fileName + '.csv')
    await saveTable(path, pk)
  }
  async function saveTable(path, pk) {
    let writer = createWriteStream(path, 'utf-8')
    for (let row of pk.enumerate()) {
      let values = Object.values(row).map(serializeValue)
      let line = JSON.stringify(values).slice(1, -1) + '\r\n'
      if (writer.write(line)) continue
      await once(writer, 'drain')
    }
    writer.end()
    await once(writer, 'finish')
  }
}
compact()