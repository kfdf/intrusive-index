import express from 'express'
import * as db from '../db/index.js'
import { enumeratePage, countPages } from '../db/query-helpers.js'
import { deleteView, editLayout, formRoot, operationsRoot, paginator, selectionFormRoot } from './shared/common.js'
import { getCharacter } from './edit-characters.js'
import { html, render } from './shared/render.js'
import { catchRerender, handleDbErrors, validate } from './shared/helpers.js'

function getTitle(req, res, next) {
  let titleId = +req.params.titleId
  let title = db.title.pk.get({ titleId })
  if (!title) throw 'route'
  let characterId = +req.params.charId
  if (title.characterId != characterId) throw 'route'
  res.locals.charTitle = title
  next()
}
function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('name', 'Name', { minLength: 1 })
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}
let titles = express.Router({ mergeParams: true })
titles.get('/', 
  getCharacter,
  function (req, res) {
    let { character } = res.locals
    let titles = db.title.charNameIx
      .enumerate(a => db.character.pk.comp(a, character))
      .map(title => { 
        let game = db.game.pk.get(title)
        return { game, title }
      })
      .toArray()
    render(res, indexView, {
      title: 'Character Titles',
      titles,
    })
  }
)
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Title'
  })
}
titles.get('/create',
  getCharacter,
  renderCreateView
)
titles.post('/create',
  beginPostHandling,
  function (req, res) {
    let characterId = +req.params.charId
    let titleId = 0
    for (let tr of db.transaction()) {
      ({ titleId } = db.title.create(tr, { 
        characterId, ...res.locals.values
      }))
    }
    res.redirect(`/edit/characters/${characterId
      }/titles/${titleId}`)
  },
  handleDbErrors,
  catchRerender,
  getCharacter,
  renderCreateView
)
titles.get('/:titleId',
  getCharacter,
  getTitle,
  function (req, res) {
    let game = db.game.pk.get(res.locals.charTitle)
    render(res, detailsView, {
      title: 'Title', game
    })
  }
)
titles.get('/:titleId/update',
  getCharacter,
  getTitle,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Title',
      values: res.locals.charTitle,
    })
  }
)
titles.post('/:titleId/update',
  beginPostHandling,
  function (req, res) {
    let titleId = +req.params.titleId
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.title.update(tr, { 
        titleId, characterId, ...res.locals.values
      })
    }
    res.redirect(`/edit/characters/${characterId
      }/titles/${titleId}`)
  },
  handleDbErrors,
  catchRerender,
  getCharacter,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Title',
    })
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Title',
    item: res.locals.charTitle.name
  })
}
titles.get('/:titleId/game', 
  getTitle,
  function (req, res) {
    let { gameId } = res.locals.charTitle
    let page = +req.query.page || 1
    let games = db.game.pk.into(enumeratePage(page)).toArray()
    let pageCount = db.game.pk.into(countPages())
    render(res, selectGameView, {
      title: 'Select Game',
      page, games, pageCount, gameId
    })
  }
)
titles.post('/:titleId/game',
  function (req, res) {
    let characterId = +req.params.charId
    let titleId = +req.params.titleId
    let gameId = +req.body.gameId || null
    for (let tr of db.transaction()) {
      db.title.update(tr, { titleId, gameId })
    }
    res.redirect(`/edit/characters/${characterId}/titles`)
  },
  handleDbErrors
)
titles.get('/:titleId/delete', 
  getTitle,
  renderDeleteView,
)
titles.post('/:titleId/delete',
  function (req, res) {
    let characterId = +req.params.charId
    let titleId = +req.params.titleId
    for (let tr of db.transaction()) {
      db.title.remove(tr, { titleId })
    }
    res.redirect(`/edit/characters/${characterId}/titles`)
  },
  handleDbErrors,
  catchRerender,
  getTitle,
  renderDeleteView
)
export default titles
function* selectGameView({ title, gameId, page, pageCount, games }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield* paginator({ page, pageCount })
  yield html`
  <form method="POST" class="${selectionFormRoot}">`
    yield html`
    <div class="default">
      <input type="radio" id="no-title"
        name="gameId" value="" ${gameId ? '' : 'checked'}>
      <label for="no-title">no game</label>
    </div>`
    for (let game of games) {
      yield html`
      <div>
        <input ${game.gameId === gameId ? 'checked' : ''} 
          id="radio_${game.gameId}" name="gameId"
          type="radio" value="${game.gameId}">
        <label for="radio_${game.gameId}">
          ${game.name} (${game.shortName})
        </label>
      </div>`
    }
    yield html`
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* detailsView({ title, character, charTitle, game }) {
  let { characterId } = character
  let { titleId } = charTitle
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/characters/${characterId}/titles">
      ${character.name} title list
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/characters/${characterId
      }/titles/${titleId}/update">
      Edit
    </a>
    <a href="/edit/characters/${characterId
      }/titles/${titleId}/delete">
      Delete
    </a>
  </div>
  <h4>Name</h4>
  <div>${charTitle.name}</div>`
  if (game) {
    yield html`
    <h4>Game</h4>
    <div>${game.name} (${game.shortName})</div>`
  }
  yield html`
  <div>
    <a href="/edit/characters/${characterId
      }/titles/${titleId}/game">
      Select game
    </a>
  </div>`  
  yield* layout.footer()
}
/** @param {any} o */
function* formView({ title, character, 
  charTitle, errors = {}, values = {}
}) {
  let { name } = errors
  let layout = editLayout({ title })
  yield* layout.header()
  if (!charTitle) {
    yield html`
    <div>
      Return to
      <a href="/edit/characters/${character.characterId}/titles">
        ${character.name} title list
      </a>
    </div>`
  }
  yield html`
  <form method="POST" class="${formRoot}" autocomplete="off">
    <div>
      <label for="name" ${name && 'class="errors"'}>
        ${name || 'Name'}
      </label>
      <input ${name && 'autofocus'} type="text"
        id="name" name="name" value="${values.name}">
    </div>
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* indexView({ title, character, titles }) {
  let { characterId } = character
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/characters/${characterId}">
      ${character.name}
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/characters/${characterId}/titles/create">
      Add new title
    </a>
  </div>
  <ul>`
  for (let { title, game } of titles) {
    yield html`
    <li><a href="/edit/characters/${characterId
      }/titles/${title.titleId}">
      ${title.name}`
      if (game) yield html`
      (${game.shortName})`
    yield html`
    </a></li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()
}
