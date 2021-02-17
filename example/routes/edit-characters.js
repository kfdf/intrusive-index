import express from 'express'
import * as db from '../db/index.js'
import { enumeratePage, countPages, pageOf } from '../db/query-helpers.js'
import { deleteView, editLayout, formRoot, gotoLinkRoot, newLinesRoot, operationsRoot, paginator, selectImageView, selectionFormRoot } from './shared/common.js'
import { html, render } from './shared/render.js'
import titles from './edit-characters-titles.js'
import relationships from './edit-characters-relationships.js'
import { catchRerender, handleDbErrors, validate } from './shared/helpers.js'

let characters = express.Router()
characters.use('/:charId/titles', titles)
characters.use('/:charId/relationships', relationships)

function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('name', 'Name', { minLength: 1 })
    .string('age', 'Age')
    .string('occupation', 'Occupation')
    .string('abilities', 'Abilities')
    .string('description', 'Description')
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}
export function getCharacter(req, res, next) {
  let characterId = +req.params.charId
  let character = db.character.pk.get({ characterId })
  if (!character) throw 'route'
  res.locals.character = character
  next()
}
characters.get('/',
  function (req, res) {
    let page = +req.query.page || 1
    let characters = db.character.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.character.nameUx.into(countPages())
    render(res, indexView, {
      title: 'Characters',
      page, characters, pageCount
    })
  }
)
characters.get('/:charId',
  getCharacter,
  function (req, res, next) {
    let { character } = res.locals
    let page = db.character.nameUx.into(pageOf(character))
    let tr = db.title.charNameIx.findRange(a =>
      db.character.pk.comp(a, character))
    let rr = db.relationship.pk.findRange(a =>
      db.character.pk.comp(a, character))
    let species = db.species.pk.get(character)
    let location = db.location.pk.get(character)
    render(res, detailsView, {
      title: 'Character',
      titleCount: tr.end - tr.start,
      relationshipCount: rr.end - rr.start,
      species, location, page
    })
  })
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Character'
  })
}
characters.get('/create', 
  renderCreateView
)
characters.post('/create', 
  beginPostHandling,
  function (req, res) {
    let characterId = 0
    for (let tr of db.transaction()) {
      ({ characterId } = db.character.create(tr, 
        res.locals.values
      ))
    }
    res.redirect('/edit/characters/' + characterId)
  },
  handleDbErrors,
  catchRerender,
  renderCreateView
)
characters.get('/:charId/update',
  getCharacter,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Character',
      values: res.locals.character
    })
  }
)
characters.post('/:charId/update',
  beginPostHandling,
  function (req, res, next) {
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.character.update(tr, { 
        characterId, ...res.locals.values 
      })
    }
    res.redirect('/edit/characters/' + characterId)
  },
  handleDbErrors,
  catchRerender,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Character',
    })
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Character',
    item: res.locals.character.name
  })
}
characters.get('/:charId/delete',
  getCharacter,
  renderDeleteView,
)
characters.post('/:charId/delete',
  getCharacter,
  function (req, res) {
    let { character } = res.locals
    let page = db.character.nameUx.into(pageOf(character))
    for (let tr of db.transaction()) {
      db.character.remove(tr, character)
    }
    res.redirect('/edit/characters?page=' + page)
  },
  handleDbErrors,
  catchRerender,
  renderDeleteView
)
characters.get('/:charId/image',
  getCharacter,
  function (req, res, next) {
    let { imageId } = res.locals.character
    let page = +req.query.page || 1
    let images = db.image.pk
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.image.pk.into(countPages())
    render(res, selectImageView, {
      title: 'Select Image',
      imageId, images, page, pageCount
    })
  }
)
characters.post('/:charId/image',
  function (req, res) {
    let imageId = req.body.image
    let characterId = +req.params.charId
    for (let tr of db.transaction()) {
      db.character.update(tr, { characterId, imageId })
    }
    res.redirect(`/edit/characters/${characterId}`)
  },
  handleDbErrors
)
characters.get('/:charId/species',
  getCharacter,
  function (req, res) {
    let { speciesId } = res.locals.character
    let page = +req.query.page || 1
    let species = db.species.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.species.nameUx.into(countPages())
    render(res, selectSpeciesView, {
      title: 'Select Species',
      page, pageCount, species, speciesId
    })
  }
)
characters.post('/:charId/species',
  function (req, res) {
    let characterId = +req.params.charId
    let speciesId = +req.body.speciesId || null
    for (let tr of db.transaction()) {
      db.character.update(tr, { characterId, speciesId })
    }
    res.redirect(`/edit/characters/${characterId}`)
  },
  handleDbErrors
)
characters.get('/:charId/location',
  getCharacter,
  function (req, res) {
    let { locationId } = res.locals.character
    let page = +req.query.page || 1
    let locations = db.location.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.location.nameUx.into(countPages())
    render(res, selectLocationView, {
      title: 'Select Location',
      locationId, page, pageCount, locations
    })
  }
)
characters.post('/:charId/location',
  function (req, res) {
    let characterId = +req.params.charId
    let locationId = +req.body.locationId || null
    for (let tr of db.transaction()) {
      db.character.update(tr, { characterId, locationId })
    }
    res.redirect(`/edit/characters/${characterId}`)
  },
  handleDbErrors
)

export default characters

function* selectSpeciesView({ title, 
  species, speciesId, page, pageCount 
}) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield* paginator({ page, pageCount })
  yield html`
  <form method="POST" class="${selectionFormRoot}">`
    yield html`
    <div class="default">
      <input type="radio" id="no-species"
        name="speciesId" value="" ${speciesId ? '' : 'checked'}>
      <label for="no-species">no species</label>
    </div>`
    for (let sp of species) {
      let id = sp.speciesId
      yield html`
      <div>
        <input ${id=== speciesId ? 'checked' : ''} 
          id="radio_${id}" name="speciesId"
          type="radio" value="${id}">
        <label for="radio_${id}">
          ${sp.name}
        </label>
      </div>`
    }
    yield html`
    <button type="submit">Submit</button>
  </form>`  
  yield* layout.footer()
}
function* selectLocationView({ title, 
  locations, locationId, page, pageCount 
}) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield* paginator({ page, pageCount })
  yield html`
  <form method="POST" class="${selectionFormRoot}" autocomplete="off">
    <div class="default">
      <input type="radio" id="no-location"
        name="locationId" value="" ${locationId ? '' : 'checked'}>
      <label for="no-location">no location</label>
    </div>`
    for (let location of locations) {
      let id = location.locationId
      yield html`
      <div>
        <input ${id == locationId ? 'checked' : ''}
          type="radio" id="radio_${id}"
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
/** @param {any} o */
function* formView({ title, values = {}, errors = {}}) {
  let { name, abilities, age, occupation, description } = errors
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <form method="POST" class="${formRoot}" autocomplete="off">
    <div>
      <label for="name" ${name && 'class="errors"'}>
        ${name || 'Name'}
      </label>
      <input ${name && 'autofocus'} type="text" id="name"
        name="name" value="${values.name}">
    </div>
    <div>
      <label for="age" ${age && 'class="errors"'}>
        ${age || 'Age'}
      </label>
      <input ${age && 'autofocus'} type="text" id="age"
        name="age" value="${values.age}">
    </div> 
    <div>
      <label for="occupation" ${occupation && 'class="errors"'}>
        ${occupation || 'Occupation'}
      </label>
      <input ${occupation && 'autofocus'} type="text" id="occupation"
        name="occupation" value="${values.occupation}">
    </div>     
    <div>
      <label for="abilities" ${abilities && 'class="errors"'}>
        ${abilities || 'Abilities'}
      </label>
      <input ${abilities && 'autofocus'} type="text" id="abilities"
        name="abilities" value="${values.abilities}">
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
function* detailsView({ title, 
  character, titleCount, relationshipCount,
  location, species, page
}) {
  let { characterId } = character
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div clss="${gotoLinkRoot}">
    Return to 
    <a href="/edit/characters?page=${page}">
    the character list
    </a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/characters/${characterId}/update">Edit</a>
    <a href="/edit/characters/${characterId}/delete">Delete</a>
    <a href="/characters/${characterId}">View</a>
  </div>
  <div>
    <a href="/edit/characters/${characterId}/titles">
      Titles: ${titleCount}
    </a>
  </div>
  <div>
    <a href="/edit/characters/${characterId}/relationships">
      Relationships: ${relationshipCount}
    </a>
  </div>
  <h4>Name</h4>
  <div>${character.name}</div>
  <h4>Age</h4>
  <div>${character.age}</div>
  <h4>Occupation</h4>
  <div>${character.occupation}</div>
  <h4>Abilities</h4>
  <div>${character.abilities}</div>
  <h4>Location</h4>`
  if (location) {
    yield html`<div>${location.name}</div>`
  } else {
    yield html`<div><em>No location</em></div>`
  }
  yield html`
  <div>
    <a href="/edit/characters/${characterId}/location">
      Select location
    </a>
  </div>
  <h4>Species</h4>`
  if (species) {
    yield html`<div>${species.name}</div>`
  } else {
    yield html`<div><em>No species</em></div>`
  }      
  yield html`
  <div>
    <a href="/edit/characters/${characterId}/species">
      Select species
    </a>
  </div>
  <h4>Image</h4>`
  if (character.imageId) {
    yield html`
    <img src="/images/${character.imageId}">`
  } else {
    yield html`
    <div><em>No image</em></div>`
  }
  yield html`
  <div>
    <a href="/edit/characters/${characterId}/image">
      Change image
    </a>
  </div>      
  <h4>Description</h4>
  <p class="${newLinesRoot}">${character.description}</p>`
  yield* layout.footer()
}
function* indexView({ title, pageCount, page, characters }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${operationsRoot}">
    <a href="/edit/characters/create">Add new character</a>
  </div>`
  yield* paginator({ pageCount, page })
  yield html`
  <ul>`
  for (let ch of characters) {
    yield html`
    <li><a href="/edit/characters/${ch.characterId}">
      ${ch.name}
    </a></li>`
  }
  yield html`
  </ul>`
  yield* layout.footer()
}