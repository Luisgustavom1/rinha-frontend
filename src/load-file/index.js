const LINE_HEIGHT = 28
const EXTRA_LINES = 2

const uploadJsonFileEl = document.querySelector("#upload-file-json")
const contentEl = document.querySelector('.content')
const jsonFileNameEl = document.querySelector("#json-file-name")
const jsonTreeViewerEl = document.querySelector("#json-tree-viewer")

const worker = new Worker("src/load-file/worker.js");

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
  jsonEntriesToTreeViewer(jsonEntries, jsonTreeViewerEl)
}

worker.onmessageerror = function() {
  showErrorMessage()
}

function showErrorMessage() {
  const filefield = document.querySelector('.filefield')
  const input = document.querySelector('#upload-file-json')

  filefield.classList.add('filefield--invalid')
  input.setAttribute('aria-describedby', "invalid-file-error")
  input.setAttribute('aria-invalid', "true")
}

function jsonEntriesToTreeViewer(entries, parentEl) {
  const details = new Map();

  for (const entry of entries) {
    const { type, name, path, value: v, empty } = entry;
    const isEnd = type === "END";

    const p = path.replace(new RegExp(`.${name}(?!.*.${name})`), '');
    const parent = details.get(p)
    if (isEnd) {
      const { detail } = details.get(path);
      if (path === p) {
        parentEl.appendChild(detail)
      } else {
        parent.detail.appendChild(detail)
      }
      continue
    }
    
    const isObj = type === "ARRAY" || type === "OBJECT";
    const fromArray = parent?.entry.type === "ARRAY";
    if (isObj) {
      const detail = createDetail(name, { isArray: type === "ARRAY", fromArray })
      details.set(path, { detail, entry })
      continue
    }

    const isNullable = v === null || v === undefined
    parent.detail.appendChild(createValueLine(name, v, { isNullable, emptyArr: empty, fromArray }))
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