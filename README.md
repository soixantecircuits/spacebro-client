# spacebro client

🌟 Connect easily to a [spacebro server](https://github.com/spacebro/spacebro).

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![node](https://img.shields.io/badge/node-4.0.x-brightgreen.svg)](https://nodejs.org/en/) [![node](https://img.shields.io/badge/node-5.3.x-brightgreen.svg)](https://nodejs.org/en/) [![node](https://img.shields.io/badge/node-6.x.x-brightgreen.svg)](https://nodejs.org/en/)

## 🌍 Installation

```bash
yarn add spacebro-client
# or
npm i -S spacebro-client
```

## 👋 Usage

First, you need to start a [spacebro server](https://github.com/soixantecircuits/spacebro).

```bash
$ npm i -g spacebro # or yarn global add spacebro
$ spacebro
```

Then, write the following client code:

```js
const { SpacebroClient } = require('spacebro-client')

const client = new SpacebroClient('127.0.0.1', 8888, {
  clientName: 'foo',
  channelName: 'bar'
})

client.on('hello', () => console.log('world'))
client.emit('hello')
```

## 🚀 API

### `class SpacebroClient([[address, port, ]options])`

Look for a server, and return a handle to the connection.

```js
// For more details about possible options, see below.
const option = {
  clientName: 'foo',
  channelName: 'bar'
}

// this call does not use any auto-discovery (mdns/avahi/bonjour) feature
// and just perfoms a basic connection request on `ws://${address}:${port}`.
const client = new SpacebroClient('127.0.0.1', 8888, options)
```

#### options:

| name | default | required | description |
|:---|:---|:---|:---|
| **clientName** | `null` | *recommended* | Your client's name. Can be useful to perform targeted events and for monitoring. |
| **channelName** | `null` | *recommended* | The channel your app will communicate in. This is especially usefull if you have multiple apps using the same server. |
| **verbose** | `true` | *optional* | Should spacebro-client display logs (connection / emission / reception)? |
| **sendBack** | `true` | *optional* | Should this client receive the events it sent? |

### `create([[address, port, ]options])`

Look for a server, and creates handle to the connection. Unlike `new SpacebroClient`, returns a promise to the handle that resolves when the connection is established.

### `client.emit(eventName[, data])`

Broadcast a specific event to all the clients in the channel. `data` must be a JSON object.

### `client.sendTo(eventName, target[, data])`

Send an event to a specific target in the channel. `data` must be a JSON object.

### `client.on(eventName, handler)`

Listen to a specific event.

### `client.once(eventName, handler)`

Listen to a specific event only once.

### `client.off(eventName)`

Remove a specific event listener.

### `client.disconnect()`

Close the connection.

## 🖥 Browser

You can use spacebro-client in the browser. You will need the following dependencies:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.8/socket.io.min.js"></script>
<script src="https://wzrd.in/standalone/socketio-wildcard@latest"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-signals/1.0.0/js-signals.min.js"></script>
```

After adding these dependencies, you can include the spacebro-client lib like any script:

```html
<script src="./dist/spacebro-client.js"></script>
```

Then use the `window.spacebroClient` object.

## ⚛ Electron

Spacebro-client also works in [Electron](http://electron.atom.io). You just `require('spacebro-client')` in your electron [main process](https://github.com/electron/electron/blob/master/docs/tutorial/quick-start.md#differences-between-main-process-and-renderer-process) and use [ipc](https://github.com/electron/electron/blob/master/docs/api/ipc-main.md) or [web-contents](https://github.com/electron/electron/blob/master/docs/api/web-contents.md) to forward events to the [renderer process](https://github.com/electron/electron/blob/master/docs/tutorial/quick-start.md#differences-between-main-process-and-renderer-process).

From the `example/electron/` folder of this repository:

```js
// In the main process.
const { app, BrowserWindow } = require('electron')
const spacebroClient = require('../../dist/spacebro-client')

let win = null

spacebroClient.connect('127.0.0.1', 8888, {
  clientName: 'foo',
  channelName: 'bar'
})

app.on('ready', () => {
  win = new BrowserWindow({ width: 800, height: 600 })
  win.loadURL(`file://${__dirname}/index.html`)

  for (const eventName of ['hello', 'world']) {
    spacebroClient.on(eventName, (data) => {
      win.webContents.send(eventName, data)
    })
  }

  win.webContents.on('did-finish-load', () => {
    setTimeout(() => { spacebroClient.emit('hello', { hello: 'world' }) }, 3000)
    setTimeout(() => { spacebroClient.emit('world', { world: 'hello' }) }, 5000)
  })
})
```

```html
<!-- index.html -->
<html>
<body>
  <script>
    require('electron').ipcRenderer.on('hello', (event, message) => {
      console.log(message)
    })
    require('electron').ipcRenderer.on('world', (event, message) => {
      console.log(message)
    })
  </script>
</body>
</html>
```

## Examples

You can find many real life examples in the `example/` folder of this repository.

## 🕳 Troubleshooting

### `new-member` event 👋

The Spacebro server automatically broadcasts a `new-member` event when a client connects. Thus, you should avoid using that event name. See the `example/simple-node` script for more details.

### Using native modules in Electron 🌀

If you want to use `spacebro-client` in an Electron app, you'll have to use [electron-rebuild](https://github.com/electron/electron-rebuild) in order to rebuild MDNS according to the version of Node.js embedded with Electron.

Use the following commands:

```bash
$ npm i --save-dev electron-rebuild # or yarn
$ ./node_modules/.bin/electron-rebuild # call the executable every time you add a new native module
```

You can also add `"rebuild": "./node_modules/.bin/electron-rebuild"` to your `package.json` and run `npm run rebuild` for convenience.

*[source](https://github.com/electron/electron/blob/master/docs/tutorial/using-native-node-modules.md)*

### yarn and node-gyp issue (i.e not compiling) 🤖

You need to use at least yarn version `0.17.8`. You might have similar problems with outdated versions of npm, simply try to update it.

*[source](https://github.com/yarnpkg/yarn/issues/1979)*

### ping pong 🏓

Do not try to test with `'ping'` and `'pong'` events, those are reserved.

```
- `ping`. Fired when a ping packet is written out to the server.
- `pong`. Fired when a pong is received from the server.
```
*[source](https://github.com/socketio/socket.io-client/issues/1022)*

## ❤️ Contribute

Please follow [Standard JS](https://github.com/feross/standard) conventions.

The package has lint testing and unit testing baked-in. Please use `npm run test` to run both sets of tests before making a pull request. Use `npm run build` to transpile the project.

The project's release versions are named after [stars in Andromeda ](https://en.wikipedia.org/wiki/List_of_stars_in_Andromeda). The current version is named Sirrah.

Enjoy !
