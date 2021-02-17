import express from 'express'
import * as db from '../db/index.js'
import { render, html } from './shared/render.js'
import { paginator, detailsLayoutRoot, listLayoutRoot, gotoLinkRoot, verticalStackRoot, newLinesRoot } from './shared/common.js'
import { formatDate } from './shared/helpers.js'
import { countPages, enumeratePage, pageOf } from '../db/query-helpers.js'

let games = express.Router()
games.get('/', 
  function (req, res) {
    let page = +req.query.page || 1
    let games = db.game.dateIx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.game.dateIx.into(countPages())
    render(res, listView, {
      title: 'Games',
      games, pageCount, page,
    })
  }
)
games.get('/:id', 
  function (req, res, next) {
    let gameId = +req.params.id
    let game = db.game.pk.get({ gameId })
    if (!game) throw 'route'
    let page = db.game.dateIx.into(pageOf(game))
    let locations = db.settingDen.gameLocationNameIx
      .enumerate(a => db.game.pk.comp(a.game, game))
      .map(a => a.location)
      .toArray()
    // let locations = db.setting.gameFk
    //   .enumerate(a => db.game.pk.comp(a, game))
    //   .map(s => db.location.pk.get(s))
    //   .sort(db.location.nameUx.comp)
    //   .toArray()
    let characters = db.appearance.gameFk
      .enumerate(a => db.game.pk.comp(a, game))
      .sort((a, b) => a.order - b.order)
      .map(a => { 
        let role = a.description
        let char = db.character.pk.get(a)
        let titles = db.title.charGameIx
          .enumerate(a => 
            db.character.pk.comp(a, char) ||
            db.game.pk.comp(a, game))      
          .toArray()
        return { role, char, titles }
      })
      .toArray()
    render(res, detailsView, {
      title: game.name,
      game, characters, locations, page
    })
  }
)
export default games

function* detailsView({ title, game, page, characters, locations }) {
  yield html`
  <div class="${detailsLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>
      <p class="${newLinesRoot}">${game.description}</p>
      <div class="${gotoLinkRoot}">
        Return to the
        <a href="/games?page=${page}">game list</a> or
        <a href="/edit/games/${game.gameId}">edit this page</a>
      </div>   
    </main>
    <aside>
      <h3>${game.shortName}</h3>`
      if (game.imageId) {
        yield html`
        <img src="/images/${game.imageId}">`
      }
      yield html`
      <h4>Released</h4>
      <div>${formatDate(game.date)}</div>`
      if (locations.length) {
        yield html`
        <h4>Locations</h4>`
        let first = true
        for (let location of locations) {
          first ? first = false : yield html`, `
          yield html`
          <a href="/locations/${location.locationId}">${
            location.name
          }</a>`
        }
      }
      yield html`
      <h4>Characters</h4>
      <ul class=${verticalStackRoot}>`
      for (let { role, char, titles } of characters) {
        yield html`
        <li>
          <a href="/characters/${char.characterId}">
            ${char.name}`
            if (titles.length) {
              yield html`
              - ${titles.map(t => t.name).join(', ')}`
            }
          yield html`
          </a>
          <small>${role}</small>
        </li>`
      }
      yield html`
      </ul>
    </aside>
  </div>`
}
function* listView({ title, games, pageCount, page }) {
  yield html`
  <div class="${listLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>`
      yield* paginator({ pageCount, page })
      yield html`
      <ul>`
      for (let game of games) {
        yield html`
        <li>
          <a href="/games/${game.gameId}">
            ${game.name} (${game.shortName})
          </a>
        </li>`
      }
      yield html`
      </ul>
      <div class="${gotoLinkRoot}">
        Go to the <a href="/characters">characters</a>,
        <a href="/locations">locations</a> or 
        <a href="/edit">editing</a>
      </div>
    </main>
  </div>`
}
