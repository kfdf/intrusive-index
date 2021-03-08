import { html, css } from './render.js'
export const verticalStackRoot = css`
& {
  list-style: none;
  padding-left: 0;
}
& > li {
  margin-bottom: 10px;
}
& > li > * {
  display: block;
}
& p {
  margin-top: 0;
}
`
export const gotoLinkRoot = css`
& {
  font-size: 0.9rem;
}
`
export const newLinesRoot = css`
& {
  white-space: pre-wrap;
}
`
export const listLayoutRoot = css`
& > header {
  border-bottom: 1px solid gray;
}
& > header {
  padding-left: 30px;
}
& > main {
  padding: 20px;
}
`
export const detailsLayoutRoot = css`
& {
  display: flex;
  flex-wrap: wrap;
}
& > header {
  width: 100%;
  border-bottom: 1px solid gray;
}
& > header > h1 {
  margin-left: 30px;
}
& > main {
  padding: 20px;
  flex-grow: 1000;
  flex-basis: 400px;
}
& > main > *:first-child {
  margin-top: 0;
}
& > aside {
  padding: 20px;
  flex-grow: 1;
  flex-basis: 400px;
  border-left: 1px solid gray;
}
& > aside > *:first-child {
  margin-top: 0;
}
`
export const paginatorRoot = css`
& a {
  text-decoration: none;
}
& form input {
  width: 2em;
}
& form {
  display: inline-block;
  margin-left: 20px;
}
& .disabled {
  opacity: 0.2;
}
`
export const selectionFormRoot = css`
& label {
  cursor: pointer;
}
& label:hover {
  background-color: #eef;
}
& .default {
  margin-bottom: 10px;
}
& > button {
  font-size: inherit;
  margin: 10px;
}
`
export const figureRoot = css`
& {
  display: inline-block;
  margin: 5px;
  padding: 5px;
  box-shadow: 0 1px 3px black;
  overflow: hidden;
  text-align: center;
  position: relative;
}
& img {
  margin: 0 auto;
}
& figcaption {
  word-break: break-all;
}
`
export const selectImageRoot = css`
& > .image-list {
  display: flex;
  flex-wrap: wrap;
}
& > .image-list > * {
  position: relative;
  max-width: 50%;
}

& > .image-list input {
  position: absolute;
  left: 50%;
  top: 50%;
  opacity: 0;
}
& > .image-list input:checked + label > .${figureRoot} {
  background-color: #ddf;
  box-shadow: 0 1px 5px blue;
}
& > button {
  font-size: inherit;
  margin: 10px;
}
& label {
  display: block;
}
& .default label {
  display: inline;
}
`
export const tableRoot = css`
& tr:nth-child(even){
  background-color: #eef8ff;
}

& th.rotated {
  transform: rotate(325deg) translateX(-0.5rem);
  min-width: 1.5rem;
  max-width: 1.5rem;
  width: 1.5rem;
  height: 2rem;
  vertical-align: bottom;
}
`
export const imageListRoot = css`
& {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}
& .${figureRoot} {
  max-width: calc(50% - 10px);
}
& .${figureRoot} figcaption {
  position: relative;
}
& .${figureRoot} .overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transform: translateY(calc(100% + 5px));
  transition: transform 0.3s;
}
& .${figureRoot} .overlay a {
  position: absolute;
  transform: translate(-50%);
  transition: transform 0.3s;
}
& .${figureRoot}:hover .overlay {
  transform: none;
}
& .${figureRoot}:hover .overlay a {
  transform: translate(-50%, calc(-100% - 5px));
}
& .${figureRoot} .overlay a {
  border: 1px solid gray;
  border-radius: 3px;
  background-color: white;
  padding: 3px 5px;
  text-decoration: none;
  color: black;
}
& .${figureRoot} .overlay a:hover {
  background-color: #eef;
}
`
export const formRoot = css`
& label {
  display: block;
}
& input,
& select,
& textarea {
  display: block;
  width: 100%;
  font-size: inherit;
}
& textarea {
  resize: vertical;
  height: 10em;
  /* font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif */
}

& > * {
  margin-bottom: 10px;
}
& .errors {
  color: red;
}
& .errors a {
  text-decoration: underline;
}
& > button {
  margin: 10px;
  font-size: inherit;
}
`
export const editLayoutRoot = css`
& {
  display: flex;
  flex-wrap: wrap;
}
& > nav {
  flex: 1 0 200px;
  border-right: 1px solid gray;
  padding: 20px;
}
& > main {
  flex: 100000 0 300px;
  padding: 0 20px;
  max-width: 100%;
}
& > main > * {
  margin-bottom: 20px;
}
`
export const operationsRoot = css`
& {
  margin-bottom: 20px;
  margin-top: 20px;
}
& > a {
  margin-right: 5px;
}
`
export function* nav() {
  yield html`
  <nav>
    <ul>
      <li><a href="/edit/locations">Locations</a></li>
      <li><a href="/edit/species">Species</a></li>
      <li><a href="/edit/games">Games</a></li>
      <li><a href="/edit/characters">Characters</a></li>
      <li><a href="/edit/images">Images</a></li>
      <br>
      <li><a href="/games">Home</a></li>
    </ul>
  </nav>`
}

export function* deleteView({ item }) {
  yield html`
  <div class="${editLayoutRoot}">`
    yield* nav()
    yield html`
    <main>
      <h4>Delete ${item}?</h4>
      <form method="POST" class="${formRoot}">
        <button type="submit">Delete</button>
      </form>
    </main>
  </div>`
}
export function editLayout({ title }) {
  return {
    *header() {
      yield html`
      <div class="${editLayoutRoot}">`
        yield* nav()
        yield html`
        <main>
          <h1>${title}</h1>`
    },
    *footer() {
        yield html`
        </main>
      </div>`
    }
  }
}
export function* paginator({ pageCount, page }) {
  yield html`
  <div class="${paginatorRoot}">`
  if (pageCount > 1) {
    if (page > 1) {
      yield html`
      <a href="?page=${page - 1}">&lt;</a>`
    } else {
      yield html`
      <span class="disabled">&lt;</span>`
    }
    yield html`
    Page ${page} of ${pageCount}`
    if (page < pageCount) {
      yield html`
      <a href="?page=${page + 1}">&gt;</a>`
    } else {
      yield html`
      <span class="disabled">&gt;</span>`
    }
    yield html`
    <form method="GET" autocomplete="off">
      <label>
        Go to page:
        <input type="text" name="page">
      </label>
      <button type="submit">Go</button>
    </form>`
  }
  yield html`
  </div>`
}
export function* selectImageView({ title,
  imageId, images, page, pageCount
}) {
  let layout = editLayout({ title })
  yield* layout.header()
  yield html`
  <h1>${title}</h1>`
  yield* paginator({ page, pageCount })
  yield html`
  <form method="POST" class="${selectImageRoot}">
    <div class="default">
      <input type="radio" name="image" id="no-image"
        value="" ${imageId ? '' : 'checked'}>
      <label for="no-image">No image</label>
    </div>
    <div class="image-list">`
    let index = 0
    for (let image of images) {
      yield html`
      <div>
        <input ${imageId === image.imageId ? 'checked' : ''}
          id="radio_${index}" name="image"
          type="radio" value="${image.imageId}" >
        <label for="radio_${index}">
          <figure class="${figureRoot}">
            <img src="/images/${image.imageId}">
            <figcaption>${image.imageId}</figcaption>
          </figure>
        </label>
      </div>`
      index++
    }
    yield html`
    </div>
    <button type="submit">Submit</button>
  </form>`
  yield* paginator({ page, pageCount })
  yield* layout.footer()
}
export function genericListLayout({ title, pageCount, page }) {
  return {
    *header() {
      yield html`
      <div class="${editLayoutRoot}">`
        yield* nav()
        yield html`
        <main>
          <h1>${title}</h1>
          <div>`
    },
    *paginator() {
          yield html`
          </div>`
          yield* paginator({ pageCount, page })
          yield html`
          <ul>`
    },
    *footer() {
          yield html`
          </ul>
        </main>
      </div>`
    }
  }
}
