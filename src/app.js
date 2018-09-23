'use strict';

const html = require('choo/html');
const choo = require('choo');
const app = choo();
app.use(countStore);
app.route('/', mainView);
app.route('/settings', settingsView);
app.route('/help', helpView);
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

function topMenu(state, emit) {
  console.log(state.route);
  return html`
    <div>
      <a class="${state.route === '/' ? 'current-route' : ''}" href="/">Bookmarks</a>
      <a class="${state.route === 'settings' ? 'current-route' : ''}" href="/settings">Settings</a>
      <a class="${state.route === 'help' ? 'current-route' : ''}" href="/help">Help</a>
    </div>
  `
}

function mainView(state, emit) {
  return html`
    <div class="container">
      ${topMenu(state, emit)}
      <h3>Bookmarks</h3>
      <input type="text" class="query" />
      <div><small>${state.items.length} bookmarks</small></div>
      <div><small>${state.selectedItems.length} selected bookmarks</small></div>
      <ul>
        ${renderList(state.selectedItems)}
      </ul>
    </div>
  `;
}

function settingsView(state, emit) {
  return html`
    <div class="container">
      ${topMenu(state, emit)}
      <h3>Settings</h3>
      <form action="">
        <table>
          <thead>
            <th>
              Name
            </th>
            <th>
              Value
            </th>
          </thead>
          <tbody>
            <tr>
              <td>Bookmarks Archive</td>
              <td><input name="bookmarksArchive" value="${state.settings
                .bookmarksArchive}" /></td>
            </tr>
          </tbody>
        </table>
        <button onclick=${onSave}>Save</button>
      </form>
    </div>
  `;
  function onSave(event) {
    event.preventDefault();
    const settings = Array.from(document.querySelector('form').elements)
      .filter(singleItem => {
        return singleItem.tagName === 'INPUT';
      })
      .map(({ value, name }) => ({ value, key: name }));
    emit('settingssave', settings);
  }
}


function helpView(state, emit) {
  return html`
    <div class="container">
      ${topMenu(state, emit)}
      <h3>Help</h3>
      <div>
        Simple app to view your bookmarks, saved in specific way. The app is still in alpha and the api is subject to change, use at your own risk.
      </div>
      <div>
        Make a dat archive with a single File bookmarks.md, where data is structured like this, a list with links, anything else is ignored:
        <div> - [Deploying a Node.js App to DigitalOcean with SSL](https://code.lengstorf.com/deploy-nodejs-ssl-digitalocean/?utm_source=nodeweekly&utm_medium=email)
        </div>
      </div>
      <div>Then open settings of this app, add archive adress, and now you can search in your bookmarks, enter the query, and tap away.</div>
    </div>
  `;
  function onSave(event) {
    event.preventDefault();
    const settings = Array.from(document.querySelector('form').elements)
      .filter(singleItem => {
        return singleItem.tagName === 'INPUT';
      })
      .map(({ value, name }) => ({ value, key: name }));
    emit('settingssave', settings);
  }
}

function renderList(items) {
  return items.map(singleEntry => {
    return html`
      <li>
        <a href="${singleEntry.subtitle}" target="_blank">${singleEntry.title}</a>
      </li>
    `;
  });
}

async function countStore(state, emitter) {
  state.items = [];
  state.selectedItems = [];
  state.settings = JSON.parse(localStorage.getItem('settings') || '{}');

  if (state.settings.bookmarksArchive) {
    console.log(state.settings.bookmarksArchive);
    const arch = await new DatArchive(state.settings.bookmarksArchive);
    const file = await arch.readFile('bookmarks.md');
    state.items = processResult(file, null, true).items || [];
    state.selectedItems = state.items.slice(
      state.items.length - 10,
      state.items.length
    );
  }
  emitter.emit('render');

  const inputQuery = document.querySelector('.query');
  if (inputQuery) {
    inputQuery.addEventListener('change', function(event) {
      state.selectedItems = state.items.filter(singleEntry => {
        return (
          singleEntry.title.toLowerCase().includes(event.target.value) ||
          singleEntry.subtitle.toLowerCase().includes(event.target.value)
        );
      });
      emitter.emit('render');
    });
  }

  emitter.on('settingssave', function(settings) {
    settings.forEach(({ key, value }) => {
      state.settings[key] = value;
    });
    console.log(state.settings);
    localStorage.setItem('settings', JSON.stringify(state.settings));
    emitter.emit('render');
  });
}
