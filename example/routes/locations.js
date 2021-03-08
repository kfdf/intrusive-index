import express from 'express'
import { detailsLayoutRoot, gotoLinkRoot, listLayoutRoot, paginator, verticalStackRoot } from './shared/common.js'
import { html, render } from './shared/render.js'
import * as db from '../db/index.js'
import { by, countPages, enumeratePage, pageOf } from '../db/query-helpers.js'

let locations = express.Router()

locations.get('/',
  function (req, res) {
    let page = +req.query.page || 1
    let locations = db.location.nameUx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.location.nameUx.into(countPages())
    render(res, listView, {
      title: 'Locations',
      locations, pageCount, page
    })
  }
)
locations.get('/:locId',
  function (req, res) {
    let locationId = +req.params.locId
    let location = db.location.pk.get({ locationId })
    if (!location) throw 'route'
    let page = db.location.nameUx.into(pageOf(location))
    let characters = db.character.locationFk
      .enumerate(a => db.location.pk.comp(a, location))
      .sort(by(ch => ch.name))
      .toArray()
    let games = db.settingDen.locGameDateIx
      .enumerate(a => db.location.pk.comp(a.location, location))
      .map(a => a.game)
      .toArray()
    // let games = db.setting.pk
    //   .enumerate(a => db.location.pk.comp(a, location))
    //   .map(s => db.game.pk.get(s))
    //   .sort(by(game => game.date))
    //   .toArray()
    render(res, detailsView, {
      title: location.name,
      page, location, characters, games
    })
  }
)
export default locations
function* detailsView({ title, page, location, characters, games }) {
  yield html`
  <div class="${detailsLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>
      <p>${location.description}</p>
      <div class="${gotoLinkRoot}">
        Return to the
        <a href="/locations?page=${page}">location list</a> or
        <a href="/edit/locations/${location.locationId}">edit this page</a>
      </div>   
    </main>  
    <aside>`
    if (characters.length) {
      yield html`
      <h4>Characters</h4>
      <ul class="${verticalStackRoot}">`
      for (let char of characters) {
        yield html`
        <li>
          <a href="/characters/${char.characterId}">
            ${char.name}
          </a>
        </li>`
      }
      yield html`
      </ul>`
    }
    if (games.length) {
      yield html`
      <h4>Games</h4>
      <ul class="${verticalStackRoot}">`
      for (let game of games) {
        yield html`
        <li>
          <a href="/games/${game.gameId}">
            ${game.name} (${game.shortName})
          </a>
        </li>`
      }
      yield html`
      </ul>`
    }
    yield html`
    </aside>  
  </div>`
}
function* listView({ title, locations, page, pageCount }) {
  yield html`
  <div class="${listLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>`
      yield* paginator({ pageCount, page })
      yield html`
      <ul>`
      for (let loc of locations) {
        yield html`
        <li>
          <a href="/locations/${loc.locationId}">
            ${loc.name}
          </a>
        </li>`
      }
      yield html`
      </ul>
      <div class="${gotoLinkRoot}">
        Go to the <a href="/characters">characters</a>,
        <a href="/games">games</a>,
        <a href="/search">search</a> or 
        <a href="/edit">editing</a>
      </div>
    </main>
  </div>`  
}