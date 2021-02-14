import express from 'express'
import * as db from '../db/index.js'
import { countPages, enumeratePage } from '../db/query-helpers.js'
import { getGame } from './edit-games.js'
import { editLayout, operationsRoot, paginator, selectionFormRoot } from './shared/common.js'
import { handleDbErrors } from './shared/helpers.js'
import { html, render } from './shared/render.js'

let locations = express.Router({ mergeParams: true })
function getLocations(req, res, next) {
  let { game } = res.locals
  res.locals.locations = db.setting.gameFk
    .enumerate(a => db.game.pk.comp(a, game))
    .map(s => db.location.pk.get(s))
    .toArray()
  next()
}
locations.get('/', 
  getGame,
  getLocations,
  function (req, res) {
    render(res, locationsView, {
      title: 'Game Locations',
    })
  }
)
locations.get('/remove',
  getGame,
  getLocations,
  function (req, res) {
    render(res, selectLocationView, {
      title: 'Remove Location',
    })
  } 
)
locations.post('/remove',
  function (req, res) {
    let gameId = +req.params.gameId
    let locationId = +req.body.locationId
    for (let tr of db.transaction()) {
      db.setting.remove(tr, { gameId, locationId })
    }
    res.redirect(`/edit/games/${gameId}/locations`)
  },
  handleDbErrors
)
locations.get('/add', 
  function(req, res) { 
    let page = +req.query.page || 1
    let locations = db.location.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.location.nameUx.into(countPages())
    render(res, selectLocationView, {
      title: 'Add Location',
      page, pageCount, locations
    })
  }
)
locations.post('/add', 
  function (req, res) {
    let gameId = +req.params.gameId
    let locationId = +req.body.locationId
    for (let tr of db.transaction()) {
      db.setting.upsert(tr, { gameId, locationId })
    }
    res.redirect(`/edit/games/${gameId}/locations`)
  },
  handleDbErrors
)
export default locations

function* locationsView({ title, game, locations }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/games/${game.gameId}">
      ${game.name}
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/games/${game.gameId
      }/locations/add">Add</a>
    <a href="/edit/games/${game.gameId
      }/locations/remove">Remove</a>
  </div>
  <ul>`
  for (let loc of locations) {
    yield html`
    <li><a href="/edit/locations/${loc.locationId}">
      ${loc.name}
    </a></li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()  
}

function* selectLocationView({ title, locations, page, pageCount }) {
  let layout = editLayout({ title })
  yield* layout.header()
  if (pageCount) {
    yield* paginator({ page, pageCount })
  }
  yield html`
  <form method="POST" class="${selectionFormRoot}" autocomplete="off">`
    for (let location of locations) {
      let id = location.locationId
      yield html`
      <div>
        <input type="radio" id="radio_${id}"
          name="locationId" value="${id}">
        <label for="radio_${id}">
          ${location.name}
        </label>
      </div>`
    }
    yield html`
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()  
}
