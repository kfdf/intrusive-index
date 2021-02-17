import express from 'express'
import * as db from '../db/index.js'
import characters from './edit-games-characters.js'
import locations from './edit-games-locations.js'
import { html, render } from './shared/render.js'
import { deleteView, formRoot, operationsRoot, editLayout, newLinesRoot, paginator, selectImageRoot, figureRoot, selectImageView, gotoLinkRoot } from './shared/common.js'
import { enumeratePage, countPages, pageOf } from '../db/query-helpers.js'
import { validate, formatDate, catchRerender, handleDbErrors } from './shared/helpers.js'

function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('name', 'Name', { minLength: 1 })
    .string('shortName', 'Short name', { minLength: 1 })
    .string('description', 'Description')
    .date('date', 'Release date')
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}
export function getGame(req, res, next) {
  let gameId = +req.params.gameId
  let game = db.game.pk.get({ gameId })
  if (!game) throw 'route'
  res.locals.game = game
  next()
}
let games = express.Router()
games.get('/', 
  function (req, res) {
    let page = +req.query.page || 1
    let games = db.game.pk
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.game.pk.into(countPages())
    render(res, indexView, {
      title: 'Games',
      games, pageCount, page
    })
  }
)

games.get('/:gameId', 
  getGame, 
  function (req, res) {
    let { game } = res.locals
    let page = db.game.dateIx.into(pageOf(game))
    let chr = db.appearance.gameFk
      .findRange(a => db.game.pk.comp(a, game))
    let lr = db.setting.gameFk
      .findRange(a => db.game.pk.comp(a, game))
    render(res, detailsView, {
      title: 'Game', 
      charCount: chr.end - chr.start,
      locCount: lr.end - lr.start,
      page
    })
  }
)
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Game'
  }) 
}
games.get('/create', 
  renderCreateView
)
games.post('/create',
  beginPostHandling,
  function (req, res) {
    let gameId = 0
    for (let tr of db.transaction()) {
      ({ gameId } = db.game.create(tr, 
        res.locals.values
      ))
    }
    res.redirect('/edit/games/' + gameId)
  },
  handleDbErrors,
  catchRerender,
  renderCreateView
)
games.use('/:gameId/characters', characters)
games.use('/:gameId/locations', locations)

games.get('/:gameId/update', 
  getGame, 
  function renderEditView(req, res) {
    render(res, formView, {
      title: 'Edit Game',
      values: res.locals.game
    })  
  }
)
games.post('/:gameId/update', 
  beginPostHandling,
  function (req, res) {
    let gameId = +req.params.gameId
    for (let tr of db.transaction()) {
      db.game.update(tr, { 
        gameId, ...res.locals.values 
      })
    }
    res.redirect('/edit/games/' + gameId)
  },
  handleDbErrors,
  catchRerender,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Game',
    })  
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Game',
    item: res.locals.game.name
  })  
}
games.get('/:gameId/delete', 
  getGame, 
  renderDeleteView
)
games.post('/:gameId/delete', 
  getGame, 
  function (req, res, next) {
    let { game } = res.locals
    let page = db.game.pk.into(pageOf(game))
    for (let tr of db.transaction()) {
      db.game.remove(tr, game)
    }
    res.redirect('/edit/games?page=' + page)
  },
  handleDbErrors,
  catchRerender,
  renderDeleteView
)

games.get('/:gameId/image', 
  getGame,
  function (req, res) {
    let { imageId } = res.locals.game
    let page = +req.query.page || 1
    let images = db.image.pk
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.image.pk.into(countPages())
    render(res, selectImageView, {
      title: 'Select Image',
      pageCount, page, imageId, images
    })
  }
)
games.post('/:gameId/image',
  function (req, res) {
    let imageId = req.body.image
    let gameId = +req.params.gameId
    for (let tr of db.transaction()) {
      db.game.update(tr, { gameId, imageId })
    }
    res.redirect(`/edit/games/${gameId}`)
  },
  handleDbErrors
)
export default games
/** @param {any} o */
function* formView({ title, values = {}, errors = {} }) {
  let { name, shortName, date, description } = errors
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
      <label for="shortName" ${shortName && 'class="errors"'}>
        ${shortName || 'Short name'}
      </label>
      <input ${shortName && 'autofocus'} type="text" 
        id="shortName" name="shortName" 
        value="${values.shortName}">
    </div>
    <div>
      <label for="date" ${date && 'class="errors"'}>
        ${date || 'Release date'}
      </label>
      <input ${date && 'autofocus'} type="text" 
        placeholder="YYYY-MM-DD" id="date" name="date" 
        value="${formatDate(values.date)}">
    </div>
    <div>
      <label for="description" ${description && 'class="errors"'}>
        ${description || 'Description'}
      </label>
      <textarea ${description && 'autofocus'} 
        id="description" name="description">${
        values.description
      }</textarea>
    </div>    
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* detailsView({ title, page, game, charCount, locCount }) {
  let { gameId } = game
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${gotoLinkRoot}">
    Return to
    <a href="/edit/games?page=${page}">
    the game list
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/games/${gameId}/update">Edit</a>
    <a href="/edit/games/${gameId}/delete">Delete</a>
    <a href="/games/${gameId}">View</a>
  </div>
  <div>
    <a href="/edit/games/${gameId}/characters">
      Characters: ${charCount}
    </a>
  </div>
  <div>
    <a href="/edit/games/${gameId}/locations">
      Locations: ${locCount}
    </a>
  </div>  
  <h4>Name</h4>
  <div>${game.name}</div>
  <h4>Short Name</h4>
  <div>${game.shortName}</div>
  <h4>Release Date</h4>
  <div>${formatDate(game.date)}</div>
  <h4>Image</h4>`
  if (game.imageId) {
    yield html`
    <img src="/images/${game.imageId}">`
  } else {
    yield html`
    <div><em>No image</em></div>`
  }  
  yield html`
  <div>
    <a href="/edit/games/${gameId}/image">
      Change image
    </a>
  </div>
  <h4>Description</h4>
  <p class="${newLinesRoot}">${game.description}</p>`
  yield* layout.footer()
}
function* indexView({ title, pageCount, page, games }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${operationsRoot}">
    <a href="/edit/games/create">Add new game</a>
  </div>`
  yield* paginator({ pageCount, page })
  yield html`
  <ul>`
  for (let game of games) {
    yield html`
    <li>
      <a href="/edit/games/${game.gameId}">
        ${game.name} (${game.shortName})
      </a>
    </li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()
}