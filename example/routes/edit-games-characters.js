import express from 'express'
import * as db from '../db/index.js'
import { enumeratePage, pageOf, countPages, sortBy } from '../db/query-helpers.js'
import { deleteView, editLayout, formRoot, operationsRoot, paginator } from './shared/common.js'
import { getGame } from './edit-games.js'
import { html, render } from './shared/render.js'
import { catchRerender, handleDbErrors, validate } from './shared/helpers.js'

let characters = express.Router({ mergeParams: true })

function getCharacter(req, res, next) {
  let characterId = +req.params.charId
  let character = db.character.pk.get({ characterId })
  if (!character) throw 'route'
  res.locals.character = character
  next()
}
function getAppearance(req, res, next) {
  let characterId = +req.params.charId
  let gameId = +req.params.gameId
  let appearance = db.appearance.pk.get({ gameId, characterId })
  if (!appearance) throw 'route'
  res.locals.appearance = appearance
  next()
}
function beginPostHandling(req, res, next) {
  validate(req, res)
    .number('order', 'Order of appearance', { integer: true })
    .string('description', 'Description', { minLength: 1 })
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}
function getCharacterPage(req, res, next) {
  res.locals.page = db.character.nameUx
    .into(pageOf(res.locals.character))
  next()
}
characters.get('/', 
  getGame, 
  function (req, res) {
    let { game } = res.locals
    let characters = db.appearance.gameFk
      .enumerate(a => db.game.pk.comp(a, game))
      .into(sortBy(a => a.order))
      .map(appearance => {
        let character = db.character.pk.get(appearance)
        return { character, appearance }
      })
      .toArray()  
    render(res, indexView, {
      title: 'Game Characters',
      characters
    })
  })
characters.get('/create', 
  getGame, 
  function (req, res) {
    let { gameId } = res.locals.game
    let page = +req.query.page || 1
    let characters = db.character.nameUx
      .into(enumeratePage(page))
      .map(character => {
        let { characterId } = character
        let appearance = db.appearance.pk.get({ gameId, characterId })
        return { character, appearance }
      })
      .toArray()
    let pageCount = db.character.nameUx.into(countPages())
    render(res, selectCharacterView, {
      title: 'New Appearance',
      characters, pageCount, page
    })
  }
)

function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Appearance',
  })   
}
characters.get('/create/:charId', 
  getGame, 
  getCharacter,
  getCharacterPage,
  renderCreateView
)
characters.post('/create/:charId', 
  beginPostHandling,
  function (req, res, next) {
    let gameId = +req.params.gameId
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.appearance.create(tr, { 
        gameId, characterId, ...res.locals.values 
      })
    }
    res.redirect(`/edit/games/${gameId
      }/characters/${characterId}`)
  }, 
  handleDbErrors,
  catchRerender,
  getGame, 
  getCharacter,
  getCharacterPage,
  renderCreateView
)

characters.get('/:charId', 
  getGame, 
  getCharacter, 
  getAppearance, 
  function (req, res) {
    render(res, detailsView, {
      title: 'Appearance',
    })
  })
characters.get('/:charId/update', 
  getGame, 
  getCharacter,
  getAppearance, 
  function (req, res) {
    render(res, formView, {
      title: 'Edit Appearance',
      values: res.locals.appearance
    })       
  }
)
characters.post('/:charId/update', 
  beginPostHandling,
  function (req, res, next) {
    let gameId = +req.params.gameId
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.appearance.update(tr, { 
        gameId, characterId, ...res.locals.values 
      })
    }
    res.redirect(`/edit/games/${gameId
      }/characters/${characterId}`)
  },
  handleDbErrors,
  catchRerender,
  getGame,
  getCharacter,
  function (req, res) {
    render(res, formView, {
      title: 'Edit Appearance',
    })       
  }
)
function renderDeleteView(req, res) {
  let { character, game } = res.locals
  render(res, deleteView, {
    title: 'Delete Appearance',
    item: character.name + ' from ' + game.name
  })  
}
characters.get('/:charId/delete', 
  getGame,
  getCharacter,
  renderDeleteView
)
characters.post('/:charId/delete', 
  function (req, res, next) {
    let gameId = +req.params.gameId
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.appearance.remove(tr, { 
        gameId, characterId 
      })
    }
    res.redirect(`/edit/games/${gameId}/characters`)
  },
  handleDbErrors,
  catchRerender,
  getGame,
  getCharacter,
  renderDeleteView
)
export default characters

function* detailsView({ title, game, character, appearance }) {
  let { gameId } = game
  let { characterId } = character
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/games/${gameId}/characters">${
      game.name
    } character list</a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/games/${gameId}/characters/${
      characterId}/update">Edit</a>
    <a href="/edit/games/${gameId}/characters/${
      characterId}/delete">Delete</a>
  </div>
  <h4>Game</h4>
  <div>${game.name}</div>
  <h4>Character</h4>
  <div>${character.name}</div>
  <h4>Order of Appearance</h4>
  <div>${appearance.order}</div>      
  <h4>Description</h4>
  <div>${appearance.description}</div>`
  yield* layout.footer()
}

/** @param {any} o */
function* formView({ title, game, appearance, 
  page, character, values = {}, errors = {} }
) {
  let { description, order } = errors
  let layout = editLayout({ title })
  yield* layout.header()
  if (page) {
    yield html`
    <div>
      Go back to 
      <a href="/edit/games/${game.gameId
        }/characters/create?page=${page}">
        the character selection
      </a>
    </div>`
  }
  yield html`
  <form method="POST" class="${formRoot}" autocomplete="off">
    <div>
      <label>Game</label>
      <input disabled value="${game.name}">
    </div>
    <div>
      <label>Character</label>
      <input disabled value="${character.name}">
    </div>
    <div>
      <label for="order" ${order && 'class="errors"'}>
        ${order || 'Order of appearance'}
      </label>
      <input ${order && 'autofocus'} type="text"
        id="order" name="order"
        value="${values.order}">
    </div>        
    <div>
      <label for="description" ${description && 'class="errors"'}>
        ${description || 'Description'}
      </label>
      <input ${description && 'autofocus'} type="text"
        id="description" name="description"
        value="${values.description}">
    </div>
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* selectCharacterView({ title, game, pageCount, page, characters }) {
  let { gameId } = game
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to 
    <a href="/edit/games/${gameId}/characters">
      ${game.name} character list
    </a> 
  </div>
  <h4>Choose a character</h4>`
  yield* paginator({ pageCount, page })
  yield html`
  <ul>`
  for (let { character, appearance } of characters) {
    if (appearance) {
      yield html`
      <li>
        <a href="/edit/games/${gameId
          }/characters/${character.characterId}">${
          character.name
        }</a> (${appearance.description})
      </li>`
    } else {
      yield html`
      <li>
        <a href="/edit/games/${gameId
          }/characters/create/${character.characterId}">
          ${character.name}
        </a>
      </li>`
    }
  }      
  yield html`
  </ul>`
  yield* layout.footer()
}
function* indexView({ title, game, characters }) {
  let { gameId } = game
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/games/${gameId}">
      ${game.name}
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/games/${game.gameId}/characters/create">
      Add new character
    </a>
  </div>
  <ul>`
  for (let { character, appearance } of characters) {
    yield html`
    <li>
      ${appearance.order}
      <a href="/edit/games/${gameId}/characters/${
        character.characterId}">${
        character.name
      }</a> (${appearance.description})
    </li>`
  }      
  yield html`
  </ul>`
  yield* layout.footer()
}