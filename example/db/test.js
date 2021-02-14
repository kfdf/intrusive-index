import * as db from './index.js'
import { by } from './query-helpers.js'

let chars = db.character.pk
  .enumerate()
  .map(char => db.appearance.pk
      .enumerate(a => db.character.pk.comp(a, char))
      .map(app => {
        let { date } = db.game.pk.get(app)
        let order = date.getTime() + app.order
        return { char, order }
      })
      .fallback({ char, order: Infinity }))
    .flatten() 
    .group(by(a => a.char.characterId))
    .map(g => g
      .sort(by(a => a.order))
      .take(1)
      .next().value)
    .sort(by(a => a.order))
    .map(a => a.char.name + ' ' + a.order)
    .toArray()
console.log(chars)
