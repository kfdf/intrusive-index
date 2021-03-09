import express from 'express'
import formidable from 'formidable'
import * as db from '../db/index.js'
import { deleteView, editLayout, figureRoot, formRoot, gotoLinkRoot, imageListRoot, paginator } from './shared/common.js'
import { html, render } from './shared/render.js'
import { enumeratePage, countPages, pageOf } from '../db/query-helpers.js'
import { dataFolder } from '../config.js'
import { join } from 'path'
import { unlink, rename } from 'fs'
import { handleDbErrors } from './shared/helpers.js'

let images = express.Router()

function getImage(req, res, next) {
  let { imageId } = req.params
  let image = db.image.pk.get({ imageId })
  if (!image) throw 'route'
  res.locals.image = image
  next()
}
images.get('/',
  function (req, res) {
    let page = +req.query.page || 1
    let images = db.image.isUsedIx
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.image.isUsedIx.into(countPages())
    render(res, indexView, {
      title: 'Images',
      pageCount, page, images
    })
  }
)


images.get('/:imageId', 
  getImage,
  function (req, res) {
    let { image } = res.locals
    let page = db.image.isUsedIx.into(pageOf(image))
    let pred = a => db.image.pk.comp(a, image)
    let characters = db.character.imageFk
      .enumerate(pred).toArray()
    let games = db.game.imageFk
      .enumerate(pred).toArray()
    render(res, detailsView, {
      title: 'Image',
      characters, games, page
    })
  }
)
images.get('/:imageId/delete', 
  function (req, res) {
    render(res, deleteView, {
      title: 'Delete Image',
      item: req.params.imageId
    })
  }
)
images.post('/:imageId/delete',
  function (req, res, next) {
    let { imageId } = req.params
    let page = 1
    for (let tr of db.transaction()) {
      db.image.update(tr, { 
        imageId, locked: true 
      }, (row, old) => {
        db.image.verifyUnlocked(old)
        db.image.verifyChildless(old)
        page = db.image.isUsedIx.into(pageOf(old))
      })
    }
    let filePath = join(dataFolder, 'images', imageId)
    unlink(filePath, err => {
      try { for (let tr of db.transaction()) {
        if (err) {
          db.image.update(tr, { imageId, locked: false })
        } else {
          db.image.remove(tr, { imageId })
        }
      }} catch(err) {
        console.log(err)
        process.exit()
      }
      if (err) {
        return next('Failed to delete the image')
      } else {
        res.redirect('/edit/images?page=' + page)
      }
    })
  },
  handleDbErrors
)

images.get('/upload',
  function(req, res) {
    render(res, uploadView, {
      title: 'Upload Image'
    })
  }
)
images.post('/upload', 
  function (req, res, next) {
    // @ts-ignore
    let form = formidable({ multiples: false })        
    form.parse(req, (err, fields, files) => {
      if (err) return next('Invalid request')
      let imageId = encodeURIComponent(files.image.name.replace(' ', '_'))
      let image
      // This double wrapping may look awful, but 
      // actually not that different from the explicit 
      // resource management proposal
      try { for (let tr of db.transaction()) {
        image = db.image.create(tr, { 
          imageId, locked: true, refCount: 0
        })
      }} catch (err) {
        return next(err)
      }
      let srcPath = files.image.path
      let dstPath = join(dataFolder, 'images', imageId)
      rename(srcPath, dstPath, err => {
        try { for (let tr of db.transaction()) {
          if (err) {
            db.image.remove(tr, { imageId })
          } else {
            db.image.update(tr, { imageId, locked: false })
          }
        }} catch (err) {
          console.log(err)
          process.exit()
        }
        if (err) {
          return next('Failed to create the image')
        } else {
          let page = db.image.isUsedIx.into(pageOf(image))   
          res.redirect('/edit/images?page=' + page)
        }
      })
    })
  },
  handleDbErrors
)
export default images
function* detailsView({ title, page, image, games, characters }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div class="${gotoLinkRoot}">
    Go back to
    <a href="/edit/images?page=${page}">
    the images
    </a>
  </div>
  <div>
    <img src="/images/${image.imageId}">
  </div>
  <h4>Name</h4>
  <div>${image.imageId}</div>`
  if (games.length) {
    yield html`
    <h4>Games</h4>
    <ul>`
    for (let game of games) {
      yield html`
      <li><a href="/edit/games/${game.gameId}">
        ${game.name} (${game.shortName})
      </a></li>`
    }
    yield html`
    </ul>`
  }
  if (characters.length) {
    yield html`
    <h4>Characters</h4>
    <ul>`
    for (let char of characters) {
      yield html`
      <li><a href="/edit/characters/${char.characterId}">
        ${char.name}
      </a></li>`
    }
    yield html`
    </ul>`
  }
  yield* layout.footer()
}
function* uploadView({ title }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <form method="POST" enctype="multipart/form-data" class="${formRoot}" autocomplete="off">
    <input type="file" name="image" accept="image/*">
    <button type="submit">Submit</button>
  </form>`
  yield* layout.footer()
}
function* indexView({ title, page, pageCount, images }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <div>
    <a href="/edit/images/upload">
      Upload an image
    </a>
  </div>`
  yield* paginator({ page, pageCount })
  yield html`
  <div class="${imageListRoot}">`
  for (let image of images) {
    yield html`
    <figure class="${figureRoot}">
      <div class="overlay">`

      yield html`
      </div>
      <img src="/images/${image.imageId}">
      <figcaption>
        <div class="overlay">`
        if (image.refCount == 0) {
          yield html`
          <a href="/edit/images/${image.imageId}/delete">
            Delete
          </a>
          </div>
            <small>UNUSED</small><br>`
        } else {
          yield html`
          <a href="/edit/images/${image.imageId}">
            Details
          </a>
          </div>`
        }          
        yield html`
        ${image.imageId}
      </figcaption>
    </figure>`
  }
  yield html`
  </div>`
  yield* paginator({ page, pageCount })
  yield* layout.footer()
}