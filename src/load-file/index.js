const LINE_HEIGHT = 28
const MAX_ELEMENTS_PER_VIEWPORT = 60

const uploadJsonFileEl = document.querySelector("#upload-file-json")
const contentEl = document.querySelector('.content')
const jsonFileNameEl = document.querySelector("#json-file-name")
const jsonTreeViewerEl = document.querySelector("#json-tree-viewer")
const jsonTreeViewerContentEl = document.querySelector(".treeviewer__content")
const jsonTreeViewerScrollEl = document.querySelector(".treeviewer__content--scroll")

const worker = new Worker("src/load-file/worker.js");

let entries = []

uploadJsonFileEl.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const invalidFile = file.type !== "application/json"
  if (invalidFile) showErrorMessage();

  worker.postMessage(file);
})

worker.onmessage = function(event) {
  const { name, jsonEntries } = event.data

  contentEl.classList.remove('content--presentation')
  contentEl.classList.add('content--treeviewer')
  jsonFileNameEl.innerHTML = name

  if (!jsonEntries.length) return;
  entries = jsonEntries
  renderEntries()
}

worker.onmessageerror = function() {
  showErrorMessage()
}

jsonTreeViewerContentEl.addEventListener("scroll", (ev) => {
  const percentage = Number((((ev.target.scrollTop + ev.target.clientHeight) / jsonTreeViewerScrollEl.clientHeight) * 100).toFixed(3));
  const maxElementsPercentage = Number(((MAX_ELEMENTS_PER_VIEWPORT / entries.length) * 100).toFixed(3));
  const shouldGetMore = (percentage % maxElementsPercentage) === 0
  if (shouldGetMore) {
    const viewportQuantity = Math.floor(maxElementsPercentage / percentage)
    const start = viewportQuantity * MAX_ELEMENTS_PER_VIEWPORT
    const end = start + MAX_ELEMENTS_PER_VIEWPORT
    loadEntries(start, end)
  }
})

function showErrorMessage() {
  const filefield = document.querySelector('.filefield')
  const input = document.querySelector('#upload-file-json')

  filefield.classList.add('filefield--invalid')
  input.setAttribute('aria-describedby', "invalid-file-error")
  input.setAttribute('aria-invalid', "true")
}

function renderEntries() {
  jsonTreeViewerScrollEl.style.height = `${entries.length * LINE_HEIGHT}px`
  loadEntries(0, MAX_ELEMENTS_PER_VIEWPORT)
}

function loadEntries(start, end) {
  jsonEntriesToTreeViewer(entries.slice(start, end), jsonTreeViewerEl, entries[0].path === "0")
}

function jsonEntriesToTreeViewer(entries, treeEl, startWithArray) {
  const details = new Map();

  for (const entry of entries) {
    const { type, name, path, value: v, empty } = entry
    const pathParsed = path.replace(new RegExp(`.${name}(?!.*.${name})`), '')
    const parent = details.get(pathParsed)

    const isObj = type === "ARRAY" || type === "OBJECT";
    const fromArray = parent ? parent.entry.type === "ARRAY" : startWithArray;
    if (isObj && !empty) {
      const detail = createDetail(name, { isArray: type === "ARRAY", fromArray })
      details.set(path, { detail, entry })

      const isFirstLevel = path === pathParsed
      if (isFirstLevel) {
        treeEl.appendChild(detail)
      } else {
        parent.detail.appendChild(detail)
      }

      continue
    }

    const isNullable = v === null || v === undefined
    parent.detail.appendChild(
      createValueLine(name, String(v), { isNullable: isNullable && !empty, emptyArr: empty, fromArray })
    )
  }
}

function createValueLine(k, v, opts = {}) {
  const span = document.createElement('span')
  span.textContent = opts.emptyArr ? '[]' : v;
  span.classList.add('tree__value')
  if (opts.isNullable) {
    span.classList.add('tree__nullable')
  }
  if (opts.emptyArr) {
    span.classList.add('tree__emptyArr')
  }
  
  const line = document.createElement('div')
  line.textContent = `${k}: `
  line.classList.add('tree__inline')
  line.classList.add(opts.fromArray ? 'tree__position' : 'tree__key')
  
  line.appendChild(span)
  return line
}

function createDetail(k, opts = {}) {
  const details = document.createElement('details')
  details.classList.add(opts.isArray ? 'tree__arr' : 'tree__obj')
  details.open = true

  const summary = document.createElement('summary')
  summary.textContent = `${k}: `
  summary.classList.add(opts.fromArray ? 'tree__position' : 'tree__key')

  details.appendChild(summary)
  return details
}