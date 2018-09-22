'use strict';

const html = require('choo/html');
const choo = require('choo');
const app = choo();
app.use(countStore);
app.route('/', mainView);
app.mount('.app');

function mappedOutput(result) {
  const items =
    result
      .filter(Boolean)
      .map(singleEntry => {
        const title = singleEntry.match(/- \[.+\]/g) || [''];
        const link = singleEntry.match(/\]\(.+\)/g) || [''];
        const absoluteLink = link[0]
          .replace(/(-\s\[)|(\])/g, '')
          .replace(/\(|\)/g, '');
        return {
          title: title[0].replace(/(-\s\[)|(\])/g, ''),
          subtitle: absoluteLink
        };
      })
      .filter(singleEntry => singleEntry.title) || [];
  return {
    items
  };
}

function processResult(markdown, input) {
  const arrayOfResults = markdown.split('\n');
  if (!input) {
    return mappedOutput(arrayOfResults);
  } else {
    const foundResult = arrayOfResults.filter(singleEntry =>
      singleEntry.toLowerCase().includes(input.toLowerCase())
    );
    return mappedOutput(foundResult);
  }
}

function mainView(state, emit) {
  return html`
    <div class="container">
      <input type="text" class="query" />
      <div><small>${state.items.length} bookmarks</small></div>
      <div><small>${state.selectedItems.length} selected bookmarks</small></div>
      <ul>
        ${renderList(state.selectedItems)}
      </ul>
    </div>
  `;
}

function renderList(items) {
  return items.map(singleEntry => {
    return html`
      <li>
        <a href="${singleEntry.subtitle}" target="_blank">${singleEntry.title}</a>
      </li>
    `
  })
}

console.log(renderList([{title: 'a'}]));

async function countStore(state, emitter) {
  state.items = [];
  state.selectedItems = [];
  const arch = await new DatArchive(window.location);
  const file = await arch.readFile('index.md');
  state.items = processResult(file, null, true).items || [];
  state.selectedItems = state.items.slice(state.items.length - 10, state.items.length);
  emitter.emit('render');
  const inputQuery = document.querySelector('.query');

  inputQuery.addEventListener('change', function(event) {
    state.selectedItems = state.items.filter(singleEntry => {
      return (
        singleEntry.title.toLowerCase().includes(event.target.value) ||
        singleEntry.subtitle.toLowerCase().includes(event.target.value)
      );
    });
    emitter.emit('render');
  });

  // emitter.on('queryChange', function(count) {
  //   console.log(arguments);
  //   // state.count += count;
  //   // emitter.emit('render');
  // });
}
