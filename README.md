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

const client = new SpacebroClient({
  host: '127.0.0.1',
  port: 36000,
  channelName: 'bar',
  client: {
    name: 'foo',
    description: "a foo tool",
    in: {
      inFoo: {
        eventName: "inFoo",
        description: "Input foo",
        type: "all"
      }
    },
    out: {
      outBar: {
        eventName: "outBar",
        description: "Output bar",
        type: "all"
      }
    }
  },
  connection: "bar/outBar => bar/inFoo"
})

client.on('inFoo', (data) => console.log('inFoo', data))
client.emit('outBar', { do: stuff})
```

The connection string was sent to the spacebro server, that will then
connects every event named `outBar` from client `bar` to a new event
named `inFoo` sent to client `bar`

## 🚀 API

### `class SpacebroClient([options], [connect])`

Look for a server, and return a handle to the connection.

```js
// For more details about possible options, see below.
const client = new SpacebroClient({
  host: '127.0.0.1',
  port: 8888,
  client: {name: 'foo'},
  channelName: 'bar'
})
```

#### options:

| name | default | required | description |
|:---|:---|:---|:---|
| **host** | - | *required* | The spacebro server's address. Ignored if `connect` is false. |
| **port** | - | *required* | The spacebro server's address. Ignored if `connect` is false. |
| **client.name** | `null` | *recommended* | Your client's name. Can be useful to perform targeted events and for monitoring. |
| **channelName** | `null` | *recommended* | The channel your app will communicate in. This is especially usefull if you have multiple apps using the same server. |
| **verbose** | `true` | *optional* | Should spacebro-client display logs (connection / emission / reception)? |
| **sendBack** | `true` | *optional* | Should this client receive the events it sent? |

#### connect

If the `connect` parameter is false, then the options are saved and a disconnected handle is returned; you have to call its `connect` method later before you can emit or receive events.

Default value: `true`


```js
const client = new SpacebroClient({
  client: {name: 'myClient'},
  channelName: 'someChannel'
}, false)

// ...

client.connect('127.0.0.1', 8888)
```

### `create([options])`

Look for a server, and creates a handle to the connection. Takes the same options as `new SpacebroClient`. Returns a Promise like `client.connect`.

### `setDefaultSettings(options, [verbose])`

Overwrite the default options of `new SpacebroClient` with the given options.

If [standard-settings](https://github.com/soixantecircuits/standard-settings) is installed in your module, `spacebro-client` will call this function with the contents of `services.spacebro` from your settings file.

### `client.connect(address, port)`

Look for a server, and connect `client` to this server. Returns a Promise that resolves to `client` when the connection is established, or throws an error if the connection fails.

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

## Socket.io callbacks (acknowledgments)

Spacebro now works with [acknowlegdments
too](https://socket.io/docs/server-api/#socket-send-args-ack) ! 

```js
const { SpacebroClient } = require('spacebro-client')

const client = new SpacebroClient({
  host: '127.0.0.1',
  port: 36000,
  channelName: 'bar',
  client: {
    name: 'foo',
    description: "a foo tool",
    in: {
      inFoo: {
        eventName: "inFoo",
        description: "Input foo",
        type: "all"
      }
    },
    out: {
      outBar: {
        eventName: "outBar",
        description: "Output bar",
        type: "all"
      }
    }
  },
  connection: "bar/outBar => bar/inFoo"
})

client.on('inFoo', (data, fn) => {
  console.log('inFoo', data)
  fn('thank you')
})

client.emit('outBar', { do: stuff}, function (data) {
  console.log('Received from callback: ' + data)
})
```


## 🖥 Browser

You can use spacebro-client in the browser. You will need the following dependencies:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.0/socket.io.js"></script>
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
const { SpacebroClient } = require('../../dist/spacebro-client')

let win = null

const client = new SpacebroClient({
  host: '127.0.0.1',
  port: 8888,
  client: {name: 'foo'},
  channelName: 'bar'
})

app.on('ready', () => {
  win = new BrowserWindow({ width: 800, height: 600 })
  win.loadURL(`file://${__dirname}/index.html`)

  for (const eventName of ['hello', 'world']) {
    client.on(eventName, (data) => {
      win.webContents.send(eventName, data)
    })
  }

  win.webContents.on('did-finish-load', () => {
    setTimeout(() => { client.emit('hello', { hello: 'world' }) }, 3000)
    setTimeout(() => { client.emit('world', { world: 'hello' }) }, 5000)
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

### `newClient` event 👋

The Spacebro server automatically broadcasts a `newClient` event when a client connects. Thus, you should avoid using that event name. See the `example/simple-node` script for more details.

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


### https

If the spacebro server is on https, use following settings:

```
  'service': {
    'spacebro': {
      'host': 'https://example.com'
      'port': 0
    }
  }
```

### subdir on server

If the server url is something like `https://example.com/subdir`. You
can use this url as host. Spacebro will process `subdir` as a path,
contrary to socket.io that would process `subdir` as a
[namespace](https://socket.io/docs/client-api/#io-url-options).

That means the requested urls will look like
`https://example.com/subdir/?EIO=3&transport=polling&sid=<id>`

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
