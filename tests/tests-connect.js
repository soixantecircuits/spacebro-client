import test from 'ava'
import sleep from 'sleep-promise'

import client from '../src/spacebro-client'

test.afterEach((t) => {
  if (!t.context.isDisconnected) {
    client.disconnect()
  }
})

test.serial.cb('Simple connect', (t) => {
  client.connect('spacebro.space', 3333, {
    channelName: 'spacebro-client-test-connect',
    clientName: 'connect1',
    verbose: false
  })

  client.on('connect', () => {
    t.pass('Connected')
    t.end()
  })
})

test.serial.cb('connect - wrong address', (t) => {
  client.connect('a.wrong.address', 12345, {
    channelName: 'spacebro-client-test-connect',
    clientName: 'connect2',
    verbose: false
  })

  client.on('connect_error', (err) => {
    t.pass('Connection error')
    t.skip.is(err, 'Cannot find server at address "a.wrong.address:12345"')
    t.end()
  })
})

test.serial.cb('connect - wrong port', (t) => {
  client.connect('spacebro.space', 12345, {
    channelName: 'spacebro-client-test-connect',
    clientName: 'connect3',
    verbose: false
  })

  client.on('connect_error', (err) => {
    t.pass('Connection error')
    t.skip.is(err, 'Cannot connect to server - wrong port')
    t.end()
  })
})

test.serial.cb('disconnect', (t) => {
  client.connect('spacebro.space', 3333, {
    channelName: 'spacebro-client-test-connect',
    clientName: 'connect4',
    verbose: false
  })

  t.plan(2)

  client.on('connect', async () => {
    client.on('disconnect', () => t.pass('Disconnected'))
    client.disconnect()

    await sleep(200)
    await t.throws(() => client.emit('what', () => 'ever'))

    t.context.isDisconnected = true
    t.end()
  })
})
