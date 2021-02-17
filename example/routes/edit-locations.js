import express from 'express'
import * as db from '../db/index.js'
import { pageSize } from '../config.js'
import { render, html } from './shared/render.js'
import { catchRerender, handleDbErrors, validate } from './shared/helpers.js'
import { newLinesRoot, paginator, deleteView, operationsRoot, formRoot, genericListLayout, editLayout, gotoLinkRoot } from './shared/common.js'
import { enumeratePage, countPages, pageOf } from '../db/query-helpers.js'

let locations = express.Router()
locations.get('/', 
  function (req, res) {
    let page = +req.query.page || 1
    let locations = db.location.nameUx
      .into(enumeratePage(page))
      .map(location => {
        let pred = a => db.location.pk.comp(a, location)
        let chr = db.character.locationFk.findRange(pred)
        let gr = db.setting.pk.findRange(pred)
        return { 
          location, 
          charCount: chr.end - chr.start,
          gameCount: gr.end - gr.start
        }
      })
      .toArray()
    let pageCount = db.location.nameUx.into(countPages())
    render(res, indexView, {
      title: 'Locations',
      locations, pageCount, page,
    })
  })

function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('name', 'Name', { minLength: 1, maxLength: 100 })
    .string('description', 'Description', { minLength: 1 })
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}

function getLocation(req, res, next) {
  let locationId = +req.params.id
  let location = db.location.pk.get({ locationId })
  if (!location) throw 'route'
  res.locals.location = location
  next()
}
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Location',
  })
}
locations.get('/create', 
  renderCreateView
)
locations.post('/create', 
  beginPostHandling,
  function (req, res) {
    let locationId = 0
    for (let tr of db.transaction()) {
      ({ locationId } = db.location.create(tr, 
        res.locals.values
      ))
    }
    res.redirect('/edit/locations/' + locationId)
  },
  handleDbErrors,
  catchRerender,
  renderCreateView
)
locations.get('/:id', 
  getLocation, 
  function (req, res) {
    let { location } = res.locals
    let page = db.location.nameUx.into(pageOf(location))
    let pred = a => db.location.pk.comp(a, location)
    let chr = db.character.locationFk.findRange(pred)
    let gr = db.setting.pk.findRange(pred)      
    render(res, detailsView, {
      title: 'Location',
      charCount: chr.end - chr.start,
      gameCount: gr.end - gr.start,
      page
    })
  }
)
locations.get('/:id/characters', 
  getLocation, 
  function (req, res) {
    let { location } = res.locals
    let page = +req.query.page || 1
    let { start, end } = db.character.locationFk
      .findRange(a => db.location.pk.comp(a, location))
    let pageCount = Math.ceil((end - start) / pageSize)
    let characters = db.character.locationFk
      .into(enumeratePage(page, start, end))
      .toArray()
    render(res, charactersView, {
      title: 'Location Characters',
      characters, pageCount, page
    })
  }
)
locations.get('/:id/games', 
  getLocation, 
  function (req, res) {
    let { location } = res.locals
    let page = +req.query.page || 1
    let { start, end } = db.settingDen.locGameDateIx
      .findRange(a => db.location.pk.comp(a.location, location))
    let pageCount = Math.ceil((end - start) / pageSize)
    let games = db.settingDen.locGameDateIx
      .into(enumeratePage(page, start, end))
      .map(a => a.game)
      // .map(s => db.game.pk.get(s))
      .toArray()
    render(res, gamesView, {
      title: 'Location Games',
      games, pageCount, page
    })
  }
)
locations.post('/:id/update', 
  beginPostHandling,
  function (req, res) {
    let locationId = +req.params.id
    for (let tr of db.transaction()) {
      db.location.update(tr, { 
        locationId, ...res.locals.values 
      })
    }
    res.redirect('/edit/locations/' + locationId)
  },
  handleDbErrors,
  catchRerender,
  function (req, res) {
    render(res, formView, {
      title: 'Edit Location',
    })  
  })
locations.get('/:id/update', 
  getLocation, 
  function (req, res) {
    render(res, formView, {
      title: 'Edit Location',
      values: res.locals.location,
    })  
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Location',
    item: res.locals.location.name
  })  
}
locations.get('/:id/delete', 
  getLocation, 
  renderDeleteView
)
locations.post('/:id/delete', 
  getLocation, 
  function (req, res, next) {
    let { location } = res.locals
    let page = Math.ceil(db.location.nameUx
      .findRange(location).end / pageSize)
    for (let tr of db.transaction()) {
      db.location.remove(tr, location)
    }
    res.redirect('/edit/locations?page=' + page)
  },
  handleDbErrors,
  catchRerender,
  renderDeleteView
)
export default locations

function* indexView({ title, locations, pageCount, page }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${operationsRoot}">
    <a href="/edit/locations/create">
      Add new location
    </a>
  </div>`
  yield* paginator({ pageCount, page })
  yield html`
  <ul>`
  for (let { location, gameCount, charCount } of locations) {
    yield html`
    <li><a href="/edit/locations/${location.locationId}">
      ${location.name
    }</a> - g: ${gameCount}, ch: ${charCount}
    </li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()
}
/** @param {any} props */
function* formView({ title, values = {}, errors = {} }) {
  let { name, description } = errors
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <form class="${formRoot}" method="POST" autocomplete="off">
    <div>
      <label for="name" ${name && 'class="errors"'}>
        ${name || 'Name'}
      </label>
      <input ${name && 'autofocus'} type="text" 
        id="name" name="name" value="${values.name}">
    </div>
    <div>
      <label for="description" ${description && 'class="errors"'}>
        ${description || 'Description'}
      </label>
      <textarea ${description && 'autofocus'} id="description" name="description">${
        values.description
      }</textarea>
    </div>
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* detailsView({ title, page, location, charCount, gameCount }) {
  let { locationId } = location
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${gotoLinkRoot}">
    Return to
    <a href="/edit/locations?page=${page}">the location list</a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/locations/${locationId}/update">Edit</a>
    <a href="/edit/locations/${locationId}/delete">Delete</a>
    <a href="/locations/${locationId}">View</a>
  </div>
  <div>
    <a href="/edit/locations/${locationId}/characters">
      Characters: ${charCount}
    </a>
  </div>
  <div>
    <a href="/edit/locations/${locationId}/games">
      Games: ${gameCount}
    </a>
  </div>      
  <h4>Name</h4>
  <div>${location.name}</div>
  <h4>Description</h4>
  <p class="${newLinesRoot}">${location.description}</p>`
  yield* layout.footer()
}
function* charactersView({ title, location, characters, pageCount, page }) {
  let layout = genericListLayout({ title, page, pageCount })
  yield* layout.header()
  yield html`
  Return to 
  <a href="/edit/locations/${location.locationId}">
    ${location.name}
  </a>`
  yield* layout.paginator()
  for (let char of characters) {
    yield html`
    <li><a href="/edit/characters/${char.characterId}">
      ${char.name}
    </a></li>`
  }  
  yield* layout.footer()
}
function* gamesView({ title, location, games, pageCount, page }) {
  let layout = genericListLayout({ title, page, pageCount })
  yield* layout.header() 
  yield html`
  Return to 
  <a href="/edit/locations/${location.locationId}">
    ${location.name}
  </a>` 
  yield* layout.paginator()  
  for (let game of games) {
    yield html`
    <li><a href="/edit/games/${game.gameId}">
      ${game.name} (${game.shortName})
    </a></li>`
  }  
  yield* layout.footer()  
}
