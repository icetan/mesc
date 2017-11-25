// @flow

import type { RedisClient } from 'redis'

import type {
  MessageProducer, MessageConsumer,
} from '../es/driver-interfaces'

// Redis Bus Driver Impl

class RedisMessageProducer<T> implements MessageProducer<T> {
  _sub: RedisClient
  _channel: string

  constructor(sub: RedisClient, channel: string) {
    this._sub = sub
    this._channel = channel
  }

  async init(produce: (event: T) => Promise<void>) {
    this._sub.on('message', (channel, json) => {
      console.log(`Got event on channel ${channel} with message ${json}`)

      const message: T = JSON.parse(json)
      produce(message)
    })

    this._sub.subscribe(this._channel)
    console.log(`Listening to ${this._channel}`)
  }
}

class RedisMessageConsumer<T> implements MessageConsumer<T> {
  _pub: RedisClient
  _channel: string

  constructor(pub: RedisClient, channel: string) {
    this._pub = pub
    this._channel = channel
  }

  async consume(message: T): Promise<void> {
    this._pub.publish(this._channel, JSON.stringify(message))
  }
}

module.exports = {
  RedisMessageProducer,
  RedisMessageConsumer,
}
