// @flow

import type {
  MessageProducer,
  MessageConsumer,
} from '../es/driver-interfaces'

// Impl

const t = require('tap')
const { Tee } = require('../drivers/util')

async function main() {
  await t.test('Tee should pass on events from it\'s producer to it\'s consumer and callback', async t => {
    t.plan(3)

    const message = 'foobar'

    let sendMessage
    const mockProducer: MessageProducer<string> = {
      init: async produce => {
        t.ok(true,
          'Producer should be inited by Tee once')
        sendMessage = produce
      },
    }

    const mockConsumer: MessageConsumer<string> = {
      consume: async msg => {
        t.equal(msg, message,
          'Consumer should get same message as produced')
      },
    }

    const tee = new Tee(mockProducer, mockConsumer)
    tee.init(async msg => {
      t.equal(msg, message,
        'Tee callback should also get same message as produced')
    })

    if (sendMessage != null) {
      await sendMessage(message)
    }
  })
}
main()
