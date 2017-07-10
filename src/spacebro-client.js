'use strict'

import wildcard from 'socketio-wildcard'
import io from 'socket.io-client'
import Signal from 'signals'
import Logger from './logger'
import assignment from 'assignment'

let settings
try {
  settings = require('standard-settings')
} catch (err) {
  settings = null
}

const patch = wildcard(io.Manager)

/*
** Returns an array of packers / unpackers applicable to a given event, sorted
** by priority; used by `SpacebroClient.on` and `SpacebroClient.sendTo`
*/
function _filterHooks (eventName, hooks) {
  return hooks
    .filter(hook => [eventName, '*'].indexOf(hook.eventName) !== -1)
    .sort(hook => -hook.priority || 0)
    .map(hook => hook.handler)
}

class SpacebroClient {
  constructor (address, port, options) {
    const defaultConfig = {
      channelName: null,
      client: {name: null},
      packers: [],
      unpackers: [],
      sendBack: true,
      verbose: true,
      multiService: false
    }

    if (options) {
      this.config = assignment(defaultConfig, options)
    } else if (settings) {
      this.config = assignment(defaultConfig, settings)
    } else {
      console.warn('SpacebroClient instance constructed without options; and standard-settings was not loaded')
      this.config = assignment(defaultConfig)
    }

    // legacy
    if (this.config.clientName) {
      console.warn(`DEPRECATED: clientName is deprecated, please use \`client: {name: ${this.config.clientName}}\` instead`)
      this.config.client.name = this.config.clientName
    }

    this.logger = new Logger(this.config.verbose)

    this.packers = []
    for (const packer of this.config.packers) {
      this.addPacker(packer.handler, packer.priority, packer.eventName)
    }
    this.unpackers = []
    for (const unpacker of this.config.unpackers) {
      this.addUnpacker(unpacker.handler, unpacker.priority, unpacker.eventName)
    }

    this.events = {}
    this.connected = false
    this.socket = null

    if (address == null && port == null) {
      return
    }

    this.connect(address, port)
  }

  connect (address, port) {
    if (typeof address !== 'string') {
      throw new Error('address must be a valid string')
    }
    if (!(port > 0)) {
      throw new Error('port must be a positive integer')
    }

    this.logger.log(
      `Trying to connect to ${address}:${port} with config:\n`, this.config
    )
    this._initSocketIO(address, port)
  }

  _initSocketIO (address, port) {
    let parsedURI = require('url').parse(address)
    let protocol = parsedURI.protocol ? '' : 'ws://'
    let url = `${protocol}${address}:${port}`

    let socket = io(url)

    patch(socket)

    socket
      .on('connect', () => {
        this.connected = true
        this.logger.log('socket connected')
        this.socket = socket
        socket.emit('register', {
          channelName: this.config.channelName,
          client: this.config.client,
          // legacy
          clientName: this.config.client.name
        })
        this.events['connect'] && this.events['connect'].dispatch(socket)
      })
      .on('connect_error', (err) => {
        this.logger.warn('error', err)
        this.connected = false
        this.events['connect_error'] && this.events['connect_error'].dispatch(err)
      })
      .on('connect_timeout', () => {
        this.logger.warn('connection timeout')
        this.events['connect_timeout'] && this.events['connect_timeout'].dispatch()
      })
      .on('error', (err) => {
        this.logger.warn('error', err)
        this.connected = false
        this.events['error'] && this.events['error'].dispatch(err)
      })
      .on('disconnect', (err) => {
        this.logger.log('socket down')
        this.events['disconnect'] && this.events['disconnect'].dispatch(err)
        this.connected = false
      })
      .on('reconnect', (data) => {
        this.logger.log('socket reconnected')
        this.events['reconnect'] && this.events['reconnect'].dispatch(data)
        this.connected = true
      })
      .on('reconnect_attempt', (attempt) => {
        this.logger.log(`socket reconnect attempt: ${attempt}`)
        this.events['reconnect_attempt'] && this.events['reconnect_attempt'].dispatch(attempt)
      })
      .on('reconnecting', (attempt) => {
        this.logger.log(`socket try to reconnect, attempt: ${attempt}`)
        this.events['reconnecting'] && this.events['reconnecting'].dispatch(attempt)
      })
      .on('reconnect_error', (err) => {
        this.logger.warn('socket reconnection error')
        this.logger.warn(err)
        this.events['reconnect_error'] && this.events['reconnect_error'].dispatch(err)
      })
      .on('reconnect_failed', (err) => {
        this.logger.warn('socket cannot reconnect')
        this.logger.warn(err)
        this.events['reconnect_failed'] && this.events['reconnect_failed'].dispatch(err)
      })

      .on('*', ({ data }) => {
        let [eventName, args] = data

        if (!this.config.sendBack && args._from === this.config.client.name) {
          return
        }
        if (this.events[eventName]) {
          this.logger.log(`socket received ${eventName} with data:`, args)
          for (let unpack of _filterHooks(eventName, this.unpackers)) {
            const unpacked = unpack({ eventName, data: args })
            args = unpacked || args
          }
          this.events[eventName].dispatch(args)
        }
      })
  }

  disconnect () {
    if (this.socket) {
      this.socket.disconnect()
    }
    this.connected = false
    this.unpackers = []
    this.packers = []
  }

  addPacker (handler, priority, eventName) {
    this.packers.push({ eventName, handler, priority })
  }
  addUnpacker (handler, priority, eventName) {
    this.unpackers.push({ eventName, handler, priority })
  }

  emit (eventName, data = {}) {
    // null is a type of Object. so we have to check null and undefined with loosy compare
    if (typeof data !== 'object' || data === null) {
      data = {data: data}
      data.altered = true
    }
    this.sendTo(eventName, null, data)
  }

  sendTo (eventName, to = null, data = {}) {
    if (this.connected) {
      data._to = to
      data._from = this.config.client.name
      for (let pack of _filterHooks(eventName, this.packers)) {
        data = pack({eventName, data}) || data
      }
      this.socket.emit(eventName, data)
    } else {
      this.logger.warn('can\'t emit, not connected.')
    }
  }

  // Reception
  on (eventName, handler, handlerContext, priority) {
    if (this.events[eventName]) {
      this.logger.warn(`Signal ${eventName} already exists`)
    }
    this.events[eventName] = new Signal()
    this.events[eventName].add(handler, handlerContext, priority)
  }

  once (eventName, handler, handlerContext, priority) {
    if (this.events[eventName]) {
      this.logger.warn(`Signal ${eventName} already exists`)
    }
    this.events[eventName] = new Signal()
    this.events[eventName].addOnce(handler, handlerContext, priority)
  }

  off (eventName) {
    this.events[eventName].dispose()
    delete this.events[eventName]
  }
}

function create (address, port, options) {
  const sc = new SpacebroClient(address, port, options)

  return new Promise((resolve, reject) => {
    sc.on('connect', () => resolve(sc))
    sc.on('connect_error', (err) => reject(err))
    sc.on('connect_timeout', () => reject(new Error('Connection timeout')))
    sc.on('error', (err) => reject(err))
  })
}

/*
** The following functions are for legacy purposes
** Instances of SpacebroClient should be used instead
*/

let spacebroClientSingleton = null

/*
** This variable is used to allow calling `on` before `connect`
*/
let beforeConnectSpacebroClient = new SpacebroClient(null, null, {
  verbose: true
})

function connect (address, port, options) {
  if (spacebroClientSingleton) {
    console.warn('A SpacebroClient socket is already open')
  }
  spacebroClientSingleton = new SpacebroClient(null, null, options)
  spacebroClientSingleton.connect(address, port)
  if (beforeConnectSpacebroClient) {
    spacebroClientSingleton.events = beforeConnectSpacebroClient.events
    beforeConnectSpacebroClient = null
  }
  return spacebroClientSingleton
}

function _checkSocket () {
  if (!spacebroClientSingleton) {
    console.warn('No SpacebroClient socket is open')
  }
  return !!spacebroClientSingleton
}

function disconnect () {
  if (_checkSocket()) {
    spacebroClientSingleton.disconnect()
  }
  spacebroClientSingleton = null
}

function addPacker (handler, priority, eventName) {
  if (_checkSocket()) {
    spacebroClientSingleton.addPacker(handler, priority, eventName)
  }
}

function addUnpacker (handler, priority, eventName) {
  if (_checkSocket()) {
    spacebroClientSingleton.addUnpacker(handler, priority, eventName)
  }
}

function emit (eventName, data = {}) {
  if (_checkSocket()) {
    spacebroClientSingleton.emit(eventName, data)
  }
}

function sendTo (eventName, to = null, data = {}) {
  if (_checkSocket()) {
    spacebroClientSingleton.sendTo(eventName, to, data)
  }
}

function _eventSocket () {
  if (!spacebroClientSingleton && !beforeConnectSpacebroClient) {
    console.warn('No SpacebroClient socket is open')
  }
  return spacebroClientSingleton || beforeConnectSpacebroClient
}

function on (eventName, handler, handlerContext, priority) {
  const socket = _eventSocket()

  if (socket) {
    socket.on(eventName, handler, handlerContext, priority)
  }
}

function once (eventName, handler, handlerContext, priority) {
  const socket = _eventSocket()

  if (socket) {
    socket.once(eventName, handler, handlerContext, priority)
  }
}

function off (eventName) {
  const socket = _eventSocket()

  if (socket) {
    socket.off(eventName)
  }
}

export default {
  SpacebroClient,
  connect,
  create,
  disconnect,
  addPacker,
  addUnpacker,
  emit,
  sendTo,
  on,
  once,
  off
}
