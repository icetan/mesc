// @flow

import type {
  MessageProducer, MessageConsumer,
} from '../es/driver-interfaces'

class Tee<T> implements MessageProducer<T> {
  _producer: MessageProducer<T>
  _consumer: MessageConsumer<T>

  constructor(producer: MessageProducer<T>, consumer: MessageConsumer<T>) {
    this._producer = producer
    this._consumer = consumer
  }

  async init(produce: (message: T) => Promise<void>): Promise<void> {
    await this._producer.init(async message => {
      await produce(message)
      await this._consumer.consume(message)
    })
  }
}

module.exports = {
  Tee,
}
