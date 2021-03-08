import express from 'express'
import * as db from '../db/index.js'
import { pageSize } from '../config.js'
import { render, html } from './shared/render.js'
import { enumeratePage, countPages, pageOf } from '../db/query-helpers.js'
import { validate, catchRerender, handleDbErrors } from './shared/helpers.js'
import { paginator, deleteView, formRoot, operationsRoot, genericListLayout, editLayout, gotoLinkRoot, tableRoot } from './shared/common.js'

function getSpecies(req, res, next) {
  let speciesId = +req.params.id
  let species = db.species.pk.get({ speciesId })
  if (!species) throw 'route'
  res.locals.species = species
  next()
}

function beginPostHandling(req, res, next) {
  validate(req, res)
    .string('name', 'Name', { minLength: 1 })
  for (let _ in res.locals.errors) throw 'rerender'
  next()
}

let species = express.Router()
species.get('/', 
  function (req, res) {
    let page = +req.query.page || 1
    let species = db.species.nameUx
      .into(enumeratePage(page))
      .map(sp => {
        let chr = db.character.speciesFk
          .findRange(a => db.species.pk.comp(a, sp))
        return { sp, charCount: chr.end - chr.start }
      })
      .toArray()
    let pageCount = db.species.nameUx.into(countPages())
    render(res, indexView, {
      title: 'Species',
      species, pageCount, page,
    })
  }
)
function renderCreateView(req, res) {
  render(res, formView, {
    title: 'New Species'
  })
}
species.get('/create', 
  renderCreateView
)
species.post('/create',
  beginPostHandling,
  function (req, res) {
    let speciesId = 0
    for (let tr of db.transaction()) {
      ({ speciesId } = db.species.create(tr, 
        res.locals.values
      ))
    }
    res.redirect('/edit/species/' + speciesId)
  },
  handleDbErrors,
  catchRerender,
  renderCreateView
)
species.get('/:id/update', 
  getSpecies, 
  function (req, res) {
    render(res, formView, {
      title: 'Edit Species',
      values: res.locals.species
    })
  })
species.post('/:id/update', 
  beginPostHandling,
  function (req, res) {
    let speciesId = +req.params.id
    for (let tr of db.transaction()) {
      db.species.update(tr, { 
        speciesId, ...res.locals.values 
      })
    }
    res.redirect('/edit/species/' + speciesId)
  },
  handleDbErrors,
  catchRerender,
  function(req, res) {
    render(res, formView, {
      title: 'Edit Species',
    })
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Species',
    item: res.locals.species.name
  })  
}
species.get('/:id/delete', 
  getSpecies, 
  renderDeleteView
)
species.post('/:id/delete', 
  getSpecies, 
  function (req, res, next) {
    let { species } = res.locals
    let page = db.species.nameUx.into(pageOf(species))
    for (let tr of db.transaction()) {
      db.species.remove(tr, species)
    }
    res.redirect('/edit/species?page=' + page)
  },
  handleDbErrors,
  catchRerender,
  renderDeleteView
)
species.get('/:id', 
  getSpecies, 
  function (req, res) {
    let { species } = res.locals
    let page = db.species.nameUx.into(pageOf(species))
    let { start, end } = db.character.speciesFk
      .findRange(a => db.species.pk.comp(a, species))
    render(res, detailsView, {
      title: 'Species',
      charCount: end - start, page
    })
  }
)
species.get('/:id/characters', 
  getSpecies, 
  function (req, res) {
    let { species } = res.locals
    let page = +req.query.page || 1
    let { start, end } = db.character.speciesFk
      .findRange(a => db.species.pk.comp(a, species))
    let pageCount = Math.ceil((end - start) / pageSize)
    let characters = db.character.speciesFk
      .into(enumeratePage(page, start, end))
      .toArray()
    render(res, charactersView, {
      title: 'Species Characters',
      characters, pageCount, page
    })
  }
)
export default species
function* charactersView({ title, species, characters, pageCount, page }) {
  let layout = genericListLayout({ title, page, pageCount })
  yield* layout.header()
  yield html`
  Return to
  <a href="/edit/species/${species.speciesId}">
    ${species.name}
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
function* detailsView({ title, page, species, charCount }) {
  let { speciesId } = species
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${gotoLinkRoot}">
    Return to 
    <a href="/edit/species?page=${page}">the species list</a>
  </div>
  <div class="${operationsRoot}">
    <a href="/edit/species/${speciesId}/update">Edit</a>
    <a href="/edit/species/${speciesId}/delete">Delete</a>
  </div>
  <div>
    <a href="/edit/species/${speciesId}/characters">
      Characters: ${charCount}
    </a>
  </div>
  <h4>Name</h4>
  <div>${species.name}</div>`
  yield* layout.footer()

}
/** @param {any} o */
function* formView({ title, values = {}, errors = {}}) {
  let { name } = errors
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
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* indexView({ title, species, page, pageCount }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${operationsRoot}">
    <a href="/edit/species/create">Add new species</a>
  </div>`
  yield* paginator({ page, pageCount })
  yield html`
  <table class="${tableRoot}">
    <thead><tr>
      <th>Chars</th>
      <th>Name</th>
    </tr></thead>
    <tbody>`
    for (let { sp, charCount } of species) {
      yield html`
      <tr>
        <td>${charCount}</td>
        <td><a href="/edit/species/${sp.speciesId}">
          ${sp.name
        }</a></td>
      </tr>`
    }
    yield html`
    </tbody>
  </table>`
  yield* layout.footer()
}
