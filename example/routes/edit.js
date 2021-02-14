import express from 'express'
import locations from './edit-locations.js'
import species from './edit-species.js'
import games from './edit-games.js'
import characters from './edit-characters.js'
import images from './edit-images.js'
import { render } from './shared/render.js'
import { editLayout } from './shared/common.js'

let edit = express.Router()
edit.use(express.urlencoded({ extended: true }))
edit.get('/', (req, res) => {
  render(res, indexView, {
    title: 'Editing'
  })
})
edit.use('/locations', locations)
edit.use('/species', species)
edit.use('/games', games)
edit.use('/characters', characters)
edit.use('/images', images)
export default edit
export function* indexView({ title }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield* layout.footer()
}