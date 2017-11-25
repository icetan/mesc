// @flow

import type { Process } from '../es/interfaces'

export type Config = {
  PROCESSOR_PORT: number;
  EVENT_DISPATCHER_URL: string;
}

// Impl

const { ProcessorRouter } = require('../es/processor-router')

const { HttpMessageProducer, HttpMessageConsumer } = require('../drivers')

class DefaultProcessorRouter<C, M> {
  run(processor: Process<C, M>, c: Config) {
    const processorRouter: ProcessorRouter<C, M> = new ProcessorRouter()

    processorRouter.init(
      new HttpMessageProducer(c.PROCESSOR_PORT),
      new HttpMessageConsumer(c.EVENT_DISPATCHER_URL),
      processor,
    )
  }
}

module.exports = {
  DefaultProcessorRouter,
}
