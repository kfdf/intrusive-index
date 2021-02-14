import { fileURLToPath } from 'url'
function getFolder(folder) {
  // @ts-ignore
  return fileURLToPath(new URL(folder, import.meta.url))
}
let { env } = process
export const port = +env.PORT || 3000
export const dataFolder = env.DATA_FOLDER || getFolder('data')
export const pageSize = +env.PAGE_SIZE || 6