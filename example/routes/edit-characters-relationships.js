import express from 'express'
import * as db from '../db/index.js'
import { enumeratePage, pageOf, countPages } from '../db/query-helpers.js'
import { deleteView, editLayout, formRoot, operationsRoot, paginator } from './shared/common.js'
import { getCharacter } from './edit-characters.js'
import { html, render } from './shared/render.js'
import { catchRerender, handleDbErrors, validate } from './shared/helpers.js'

function getOtherCharacter(req, res, next) {
  let characterId = +req.params.otherCharId
  let character = db.character.pk.get({ characterId })
  if (!character) throw 'route'
  res.locals.otherChar = character
  next()
}
function getOtherCharacterPage(req, res, next) {
  res.locals.page = db.character.nameUx
    .into(pageOf(res.locals.otherChar))
  next()
}
function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('description', 'Description', { minLength: 1 })
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}

function getRelationship(req, res, next) {
  let characterId = +req.params.charId
  let otherCharacterId = +req.params.otherCharId
  let relationship = db.relationship.pk
    .get({ characterId, otherCharacterId })
  if (!relationship) throw 'route'
  res.locals.relationship = relationship
  next()
}
let relationships = express.Router({ mergeParams: true })
relationships.get('/',
  getCharacter,
  function (req, res) {
    let { character } = res.locals
    let relationships = db.relationship.pk
      .enumerate(a => db.character.pk.comp(a, character))
      .map(rel => {
        let { description, otherCharacterId: characterId } = rel
        let other = db.character.pk.get({ characterId })
        return { description, other }
      })
      .toArray()
    render(res, indexView, {
      title: 'Character Relationships',
      relationships
    })
  }

)
relationships.get('/create',
  getCharacter,
  function (req, res) {
    let { characterId } = res.locals.character
    let page = +req.query.page || 1
    let characters = db.character.nameUx
      .into(enumeratePage(page))
      .map(other => {
        let otherCharacterId = other.characterId
        let relationship = db.relationship.pk
          .get({ characterId, otherCharacterId })
        return { relationship, other }
      })
      .toArray()
    let pageCount = db.character.pk.into(countPages())
    render(res, characterSelectionView, {
      title: 'New Relationship',
      characters, page, pageCount,
    })
  }
)
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Relationship',
  })
}
relationships.get('/create/:otherCharId',
  getCharacter,
  getOtherCharacter,
  getOtherCharacterPage,
  renderCreateView
)
relationships.post('/create/:otherCharId',
  beginPostHandling,
  function (req, res) {
    let characterId = +req.params.charId
    let otherCharacterId = +req.params.otherCharId
    for (let tr of db.transaction()) {
      db.relationship.create(tr, {
        characterId, otherCharacterId, ...res.locals.values
      })
    }
    res.redirect(`/edit/characters/${characterId
      }/relationships/${otherCharacterId}`)
  },
  handleDbErrors,
  catchRerender,
  getCharacter,
  getOtherCharacter,
  getOtherCharacterPage,
  renderCreateView
)
relationships.get('/:otherCharId', 
  getCharacter,
  getOtherCharacter,
  getRelationship,
  function (req, res, next) {
    render(res, detailsView, {
      title: 'Relationship'
    })
  }
)
relationships.get('/:otherCharId/update',
  getCharacter,
  getOtherCharacter,
  getRelationship,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Relationship',
      values: res.locals.relationship
    })
  }
)
relationships.post('/:otherCharId/update',
  beginPostHandling,
  function (req, res) {
    let characterId = +req.params.charId
    let otherCharacterId = +req.params.otherCharId
    for (let tr of db.transaction()) {
      db.relationship.update(tr, { 
        characterId, otherCharacterId, ...res.locals.values
      })
    }
    res.redirect(`/edit/characters/${characterId
      }/relationships/${otherCharacterId}`)
  },
  handleDbErrors,
  catchRerender,
  getCharacter,
  getOtherCharacter,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Relationship',
    })
  }
)
function renderDeleteView(req, res) {
  let { character, otherChar} = res.locals
  render(res, deleteView, {
    title: 'Delete Relationship',
    item: `the relationship between ${
      character.name} and ${otherChar.name}`
  })
}
relationships.get('/:otherCharId/delete',
  getCharacter,
  getOtherCharacter,
  renderDeleteView
)
relationships.post('/:otherCharId/delete',
  function (req, res) {
    let characterId = +req.params.charId
    let otherCharacterId = +req.params.otherCharId
    for (let tr of db.transaction()) {
      db.relationship.remove(tr, { 
        characterId, otherCharacterId 
      })
    }
    res.redirect(`/edit/characters/${characterId}/relationships`)
  },
  handleDbErrors,
  catchRerender,
  getCharacter,
  getOtherCharacter,
  renderDeleteView
)

export default relationships

function* detailsView({ title, character, otherChar, relationship }) {
  let { characterId } = character
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/characters/${characterId}/relationships">${
      character.name
    } relationship list</a>
  </div>
  <div class="${operationsRoot}">
  <a href="/edit/characters/${characterId
      }/relationships/${otherChar.characterId}/update">
      Edit
    </a>
    <a href="/edit/characters/${characterId
      }/relationships/${otherChar.characterId}/delete">
      Delete
    </a>
  </div>
  <h4>Character</h4>
  <div>${otherChar.name}</div>
  <h4>Description</h4>
  <div>${relationship.description}</div>`
  yield* layout.footer()
}
/** @param {any} o */
function* formView({ title, character, otherChar, 
  relationship, page, values = {}, errors = {}
}) {
  let { description } = errors
  let layout = editLayout({ title })
  yield* layout.header()
  if (!relationship) {
    yield html`
    <div>
      Go back to
      <a href="/edit/characters/${character.characterId
        }/relationships/create?page=${page}">
        the character selection
      </a>
    </div>`
  }
  yield html`
  <form method="POST" class="${formRoot}" autocomplete="off" >
    <div>
      <label>Character</label>
      <input disabled value="${character.name}">
    </div>
    <div>
      <label>Other Character</label>
      <input disabled value="${otherChar.name}">
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
function* characterSelectionView({ title, characters, character, page, pageCount }) {
  let { characterId } = character
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    Return to
    <a href="/edit/characters/${characterId}/relationships">
      ${character.name} relationship list
    </a>
  </div>
  <h4>Choose a character</h4>`
  yield* paginator({ page, pageCount })
  yield html`
  <ul>`
  for (let { other, relationship } of characters) {
    if (other.characterId == characterId) {
      yield html`
      <li>${other.name}</li>`
    } else if (relationship) {
      yield html`
      <li>
        <a href="/edit/characters/${characterId
          }/relationships/${other.characterId}">${
          other.name
        }</a> (${relationship.description})
      </li>`      
    } else {
      yield html`
      <li>
        <a href="/edit/characters/${characterId
          }/relationships/create/${other.characterId}">
          ${other.name}
        </a>
      </li>`
    }
  }
  yield html`
  </ul>`
  yield* layout.footer()
}
function* indexView({ title, character, relationships }) {
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
  <div>
    <a href="/edit/characters/${characterId}/relationships/create">
      Add new relationship
    </a>
  </div>
  <ul>`
  for (let { description, other } of relationships) {
    yield html`
    <li>
      <a href="/edit/characters/${characterId
        }/relationships/${other.characterId}">
        ${other.name} - ${description}
      </a>
    </li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()
}
