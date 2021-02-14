import express from 'express'
import formidable from 'formidable'
import * as db from '../db/index.js'
import { deleteView, editLayout, figureRoot, formRoot, imageListRoot, paginator } from './shared/common.js'
import { html, render } from './shared/render.js'
import { enumeratePage, DbError, countPages } from '../db/query-helpers.js'
import { dataFolder, pageSize } from '../config.js'
import { join } from 'path'
import { unlink, rename } from 'fs'
import { catchRerender, handleDbErrors } from './shared/helpers.js'
import { verifyChildless, verifyUnlocked } from '../db/views/images.js'

let images = express.Router()

images.get('/',
  function (req, res) {
    let page = +req.query.page || 1
    let images = db.image.pk
      .into(enumeratePage(page))
      .toArray()
    let pageCount = db.image.pk.into(countPages())
    render(res, indexView, {
      title: 'Images',
      pageCount, page, images
    })
  }
)
function renderDeleteView(req, res) {
  render(res, deleteView, {
    title: 'Delete Image',
    item: req.params.image
  })
}
images.get('/:image/delete', 
  renderDeleteView
)
images.post('/:imageId/delete',
  function (req, res, next) {
    let { imageId } = req.params
    let page = Math.ceil(db.image.pk
      .findRange({ imageId }).end / pageSize)
    for (let tr of db.transaction()) {
      db.image.update(tr, { 
        imageId, locked: true 
      }, (row, old) => {
        verifyUnlocked(old)
        verifyChildless(old)
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
function renderUploadView(req, res) {
  render(res, uploadView, {
    title: 'Upload Image'
  })
}
images.get('/upload',
  renderUploadView
)
images.post('/upload', 
  function (req, res, next) {
    // @ts-ignore
    let form = formidable({ multiples: false })        
    form.parse(req, (err, fields, files) => {
      if (err) return next('Invalid request')
      let imageId = encodeURIComponent(files.image.name.replace(' ', '_'))
      try { for (let tr of db.transaction()) {
        db.image.create(tr, { 
          imageId, locked: true
        })
      }} catch (err) {
        return next(err)
      }
      let srcPath = files.image.path
      let dstPath = join(dataFolder, 'images', imageId)
      rename(srcPath, dstPath, err => {
        try {for (let tr of db.transaction()) {
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
          let page = Math.ceil(db.image.pk
            .findRange({ imageId }).end / pageSize)          
          res.redirect('/edit/images?page=' + page)
        }
      })
    })
  },
  handleDbErrors
)
export default images
function* uploadView({ title, error }) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <form method="POST" enctype="multipart/form-data" class="${formRoot}" autocomplete="off">
    <div class="errors">${error}</div>
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
      <div class="overlay">
        <a href="/edit/images/${image.imageId}/delete">
          Delete
        </a>
      </div>
      <img src="/images/${image.imageId}">
      <figcaption>${image.imageId}</figcaption>
    </figure>`
  }
  yield html`
  </div>`
  yield* paginator({ page, pageCount })
  yield* layout.footer()
}