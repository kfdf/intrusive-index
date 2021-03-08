import express from 'express'
import * as db from '../db/index.js'
import { by, countPages, enumeratePage } from '../db/query-helpers.js'
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
      .sort(by(a => a.game.date))
      .toArray()
    let titles  = db.title.charNameIx
      .enumerate(a => db.character.pk.comp(a, char))
      .map(title => {
        let game = db.game.pk.get(title)
        return { game, title }
      })
      // already sorted by name, so `segment` instead of `group`
      .segment((a, b) => db.title.nameComp(a.title, b.title))
      .map((iitg, i) => {
        let title 
        let games = iitg
          .map(a => (title = title || a.title.name, a.game))
          .filter(g => !!g)
          .sort(by(g => g.date))
          .toArray()
        let date = games.length ? +games[0].date : 0
        return { title, games, date, i }
      })
      .sort((a, b) => a.date - b.date || a.i - b.i)
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
      for (let { title, games } of titles) {
        yield html`
        <li><span>
        ${title}`
        if (games.length) {
          yield html` (`
          let first = true
          for (let game of games) {
            first ? first = false : yield html`, `
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
        <a href="/locations">locations</a>,
        <a href="/search">search</a> or 
        <a href="/edit">editing</a>
      </div>
    </div>
  </main>`
}