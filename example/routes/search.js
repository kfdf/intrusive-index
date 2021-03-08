import express from 'express'
import { getWords } from '../db/fts-helpers.js'
import * as db from '../db/index.js'
import { formRoot, gotoLinkRoot, listLayoutRoot, verticalStackRoot } from './shared/common.js'
import { html, render } from './shared/render.js'

let search = express.Router()

search.get('/', 
  function (req, res) {
    let words, tree, results, continueFrom
    if (req.query.terms) {
      let terms = getWords(String(req.query.terms))
      
      ;({ tree, words } = db.invIndex.search(terms))
      results = []
      if (req.query.type) {
        let type = req.query.type
        let id = +req.query.id
        let pos = +req.query.pos
        // @ts-ignore
        tree.advance({ type, id, pos })
      }
      let steps = 0
      while (results.length < 10 && ++steps < 20) {
        tree.advance()
        let { value: row, matched } = tree
        if (row === undefined) break
        if (!matched) continue
        let document
        let link
        let header
        if (row.type === 'game') {
          let game = db.game.pk.get({ gameId: row.id })
          if (!game) continue
          document = game.description
          link = '/games/' + row.id
          header = `${game.name}(${game.shortName})`
        } else if (row.type === 'loc') {
          let loc = db.location.pk.get({ locationId: row.id })
          if (!loc) continue
          document = loc.description
          link = '/locations/' + row.id
          header = loc.name
        } else if (row.type === 'char') {
          let char = db.character.pk.get({ characterId: row.id })
          if (!char) continue
          document = char.description
          link = '/characters/' + row.id
          header = char.name
        }
        let sentence = document.slice(row.sentenceStart, row.sentenceEnd)
        results.push({ link, sentence, header })
      }
      if (tree.value !== undefined) {
        continueFrom = new URLSearchParams({
          terms: String(req.query.terms),
          type: tree.value.type,
          id: String(tree.value.id),
          pos: String(tree.value.pos),
        }).toString()
      }
    }
    render(res, indexView, {
      title: 'Search',
      words, results, continueFrom
    })
  }
)

export default search

function* indexView({ title, words, results, continueFrom, terms }) {
  yield html`
  <div class="${listLayoutRoot}">
    <header>
      <h1>${title}</h1>
    </header>
    <main>
      <form method="GET" class="${formRoot}">
        <div>
          <input type="text" name="terms" placeholder="e.g. youkai forest">
        </div>
        <button type="submit">Search</button>
      </form>
      <div>`
      if (words) {
        yield html`
        <h4>Search results for</h4>
        <ul>`
        for (let forms of words) {
          yield html`
          <li>${forms.join(', ')}
          </li>`
        }
        yield html`
        </ul>
        <ul class="${verticalStackRoot}">`
        for (let { link, sentence, header } of results) {
          yield html`
          <li>
            <a href="${link}">${header}</a>
            <p>${sentence}</p>
          </li>`
        }
        yield html`
        </ul>`
      }
      yield html`
      </div>`
      if (continueFrom) {
        yield html`
        <div><a href="/search?${continueFrom}">
          Load more results
        </a></div>`
      }
      yield html`
      <br>
      <div class="${gotoLinkRoot}">
        Go to the <a href="/games">games</a>,
        <a href="/locations">locations</a>,
        <a href="/characters">characters</a> or 
        <a href="/edit">editing</a>
      </div>      
    </main>
  </div>`
}