import express from 'express'
import * as config from './config.js'
import games from './routes/games.js'
import characters from './routes/characters.js'
import locations from './routes/locations.js'
import edit from './routes/edit.js'
import { join } from 'path'
import http from 'http'

let app = express()
let imagesFolder = join(config.dataFolder, 'images')
app.use('/images', express.static(imagesFolder))
app.use('/games', games)
app.use('/characters', characters)
app.use('/locations', locations)
app.use('/edit', edit)
app.get('/', (req, res) => res.redirect('/games'))

app.listen(config.port, '127.0.0.1', () => {
  console.log('listening on localhost:' + config.port)
})
