// @flow

import type { MessageProducer, MessageConsumer } from './driver-interfaces'

import type { Process } from './interfaces'

// Impl

class ProcessorRouter<C, M> {
  init(
    commandProducer: MessageProducer<C>,
    messageConsumer: MessageConsumer<M>,
    processCommand: Process<C, M>,
  ) {
    const process_ = async(command: C) => {
      try {
        const message = await processCommand(command)
        try {
          // TODO: It is very important that after a command has been processed
          // that it gets stored in the event store. This needs to be part of a
          // transaction together with the processor and message saved on a
          // queue until confirmed as stored.
          await messageConsumer.consume(message)
        } catch (err) {
          console.warn(`Processor router could not propagate message: ${err.message}`)
        }
      } catch (err) {
        console.warn(`Processor error ${err.message}`)
      }
    }

    commandProducer.init(command => {
      process_(command)
      // Don't wait for the processor to finish return a resolved promise
      // directly.
      return Promise.resolve()
    })
  }
}

module.exports = {
  ProcessorRouter,
}
