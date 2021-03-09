import { Sequence } from './intrusive-index.js'
import * as db from './index.js'
import { by } from './query-helpers.js'
db.species.pk
  .enumerate()
  .map(species => db.character.speciesFk
    .enumerate(a => db.species.pk.comp(a, species))
    .map(character => db.appearance.pk
      .enumerate(a => db.character.pk.comp(a, character))
      .map(appearance => {
        let game = db.game.pk.get(appearance)
        return { species, character, appearance, game }
      }))
    .flatten())
  .flatten()
  .map(a => a.species.name + ' ' + 
    a.character.name + ' in ' + a.game.name)
  .into(rator => Sequence.from(function*() {
    while (true) {
      let batch = rator.take(100).toArray()
      if (batch.length == 0) break
      yield batch
    }
  }()))
  .forEach(arr => console.log(arr))
   

db.character.pk
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
  .segment(by(a => a.char.characterId))
  .map(g => g
    .reduce((m, a) => m.order < a.order ? m : a))
  .sort(by(a => a.order))
  .map(a => a.char.name + ' (' + a.order + ')')
  .forEach(a => console.log(a))
