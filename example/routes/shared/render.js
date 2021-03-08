/*
Initially, this example used ejs for templating, but I've
grown to dislike it. I like how it works, but not how it 
looks and that it sits in separate files, and autocompletion
doesn't work with it. Keeping stuff in js has its upsides. 
Also I'm not on good terms with css, especially organizing it, 
so when I throw in some css rules I want them to be scoped to 
the component and only appear on a page if the component 
is used on that page. This tiny framework does all that.
*/
export function html(strings, ...args) {
  return { strings, args }
}
let tag = Symbol()
export function css(strings, ...args) {
  return { strings, args, [tag]: true }
}
let classes = new Map()
function getStyleClass(style) {
  let klass = classes.get(style)
  if (klass) return klass
  klass = "style-" + classes.size
  classes.set(style, klass)
  return klass
}
let texts = new Map()
function getStyleText(style) {
  let text = texts.get(style)
  if (text) return text
  let { strings, args } = style
  let index = 0
  text = strings[index++]
  for (let arg of args) {
    if (arg[tag]) {
      text += text.endsWith('.') ?
        getStyleClass(arg) : getStyleText(arg)
    } else {
      text += String(arg)
    }
    text += strings[index++]
  }
  texts.set(style, text)
  return text    
}
export function render(res, gen, locals) {
  let props = { 
    ...res.app.locals, 
    ...res.locals, 
    ...locals
  }
  let styles = new Set()
  let body = []
  for (let { strings, args } of gen(props)) {
    let index = 0
    body.push(strings[index++])
    for (let arg of args) {
      if (arg == null) {
        //
      } else if (arg[tag]) {
        styles.add(arg)
        body.push(getStyleClass(arg))
      } else {
        body.push(arg)
      }
      body.push(strings[index++])
    }
  }
  let head = []
  for (let style of styles) {
    let text = getStyleText(style)
    let klass = getStyleClass(style)
    text = text.replace(/&(?!amp;)/g, '.' + klass)
    head.push(text)
  }
  res.setHeader('content-type', 'text/html')
  res.send(
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Touhou Wiki - ${props.title}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    p {
      font-family: 'Times New Roman', Times, serif;
    }
    ul {
      padding-left: 20px;
    }
    img {
      display: block;
      max-width: 100%;
    }
    a:hover {
      background-color: #eef;
    }
  </style>
  <style>${head.join('')}</style>
</head>
<body>
  ${body.join('')}
</body>
</html>`)
}
