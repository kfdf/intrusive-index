import express from 'express'
import * as db from '../db/index.js'
import { countPages, enumeratePage, keyedGroups, sortBy } from '../db/query-helpers.js'
import { pageSize } from '../config.js'
import { render, html } from './shared/render.js'
import { paginator, detailsLayoutRoot, gotoLinkRoot, listLayoutRoot, verticalStackRoot, newLinesRoot } from './shared/common.js'

let characters = express.Router()
characters.get('/', 
  function (req, res) {
    let page = +req.query.page || 1
    let characters = db.character.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.character.nameUx.into(countPages())
    render(res, listView, {
      title: 'Characters',
      characters, pageCount, page,
    })
  }
)
characters.get('/:id', 
  function (req, res, next) {
    let characterId = +req.params.id
    // let char = db.character.pk.get({ characterId })
    let { start, end, atStart: char } = db.character.pk
      .findRange({ characterId })
    if (start === end) return next()
    let species = db.species.pk.get(char)
    let location = db.location.pk.get(char)
    let relationships = db.relationship.pk
      .enumerate(a => db.character.pk.comp(a, char))
      .map(row => {
        let { otherCharacterId: characterId, description } = row
        let { name } = db.character.pk.get({ characterId })
        return { characterId, name, description }
      })
      .toArray()
    let appearances = db.appearance.pk
      .enumerate(a => db.character.pk.comp(a, char))
      .map(row => ({
        game: db.game.pk.get(row),
        description: row.description,
      }))
      .toArray()
    let titles  = db.title.charNameIx
      .enumerate(a => db.character.pk.comp(a, char))
      .map(title => ({ title, game: db.game.pk.get(title) }))
      .group((a, b) => db.title.nameComp(a.title, b.title))
      .into(keyedGroups(a => a.title.name, a => a.game))
      .map(a => (a.values.sort((a, b) => +a.date - +b.date), a))
      .into(sortBy(a => a.values.length ? +a.values[0].date : 0))
      .toArray()
    
    render(res, detailsView, {
      title: char.name, appearances, titles,
      char, species, location, relationships,
      page: Math.ceil(end / pageSize)
    })
  }
)
export default characters
function* detailsView({ 
  title, char, appearances, titles, species,
  relationships, page, location
}) {
  yield html`
  <div class="${detailsLayoutRoot}">
  <header>
    <h1>${title}</h1>
  </header>
  <main>
    <p class="${newLinesRoot}">${
      char.description
    }</p>`
    if (relationships.length) {
      yield html`
      <h3>Relationships</h3>
      <div class="relationships">
        <ul class="${verticalStackRoot}">`
        for (let rel of relationships) {
          yield html`
          <li><span>
            <a href="/characters/${rel.characterId}">
              ${rel.name}
            </a>(${rel.description})
          </span></li>`
        }
        yield html`
        </ul>
      </div>`
    }
    if (titles.length) {
      yield html`
      <h3>Titles</h3>
      <ul class=${verticalStackRoot}>`
      for (let { key, values } of titles) {
        yield html`
        <li><span>
        ${key}`
        if (values.length) {
          yield html` (`
          for (let i = 0; i < values.length; i++) {
            let game = values[i]
            if (i) yield html`, `
            yield html`<a href="/games/${game.gameId}">${
              game.shortName
            }</a>`            
          }
          yield html`)`
        }
        yield html`
        </span></li>`
      }
      yield html`
      </ul>`
    }    
    yield html`
    <div class="${gotoLinkRoot}">
      Go back to the 
      <a href="/characters?page=${page}">character list</a> or
      <a href="/edit/characters/${char.characterId}">edit this page</a>
    </div>      
  </main>
  <aside>`
    if (char.imageId) {
      yield html`
      <img src="/images/${char.imageId}">`
    }
    if (species) {
      yield html`
      <h4>Species</h4>
      <div>${species.name}</div>`
    }
    yield html`
    <h4>Age</h4>
    <div>${char.age}</div>
    <h4>Occupation</h4>
    <div>${char.occupation}</div>
    <h4>Abilities</h4>
    <div>${char.abilities}</div>`
    if (location) {
      yield html`
      <h4>Location</h4>
      <a href="/locations/${location.locationId}">
      ${location.name}
      </a>`
    }
    if (appearances.length) {
      yield html`
      <h4>Appearances</h4>
      <ul class=${verticalStackRoot}>`
      for (let app of appearances) {
        yield html`
        <li>
          <a href="/games/${app.game.gameId}">
            ${app.game.name} (${app.game.shortName})
          </a>
          <small>${app.description}</small>
        </li>`
      }
      yield html`
      </ul>`
    }
    yield html`
    </aside>
  </div>`
}
function* listView({ title, characters, pageCount, page }) {
  yield html`
  <div class="${listLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>`
      yield* paginator({ pageCount, page })
      yield html`
      <ul>`
      for (let char of characters) {
        yield html`
        <li>
          <a href="/characters/${char.characterId}">
            ${char.name}
          </a>
        </li>`
      }
      yield html`
      </ul>
      <div class="${gotoLinkRoot}">
        Go to the <a href="/games">games</a>,
        <a href="/locations">locations</a> or 
        <a href="/edit">editing</a>
      </div>
    </div>
  </main>`
}