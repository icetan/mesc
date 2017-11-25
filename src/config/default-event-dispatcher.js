// @flow

export type Config = {
  MONGO_EVENT_URL: string;
  MONGO_EVENT_COLLECTION: string;
  REDIS_EVENT_URL: string;
  REDIS_EVENT_CHANNEL: string;
  EVENT_DISPATCHER_PORT: number;
}

// Impl

const redis = require('redis')
const mongodb: any = require('mongodb')

const { EventDispatcher } = require('../es/event-dispatcher')
const {
  HttpMessageProducer, RedisMessageConsumer,
  MongoEventStore,
} = require('../drivers')

class DefaultEventDispatcher<M> {
  async run(c: Config) {
    const pub = redis.createClient(c.REDIS_EVENT_URL)
    const mdb = await mongodb.connect(c.MONGO_EVENT_URL)

    const dispatcher: EventDispatcher<M> = new EventDispatcher()
    dispatcher.dispatch(
      new HttpMessageProducer(c.EVENT_DISPATCHER_PORT),
      new RedisMessageConsumer(pub, c.REDIS_EVENT_CHANNEL),
      new MongoEventStore(mdb, c.MONGO_EVENT_COLLECTION),
    )
  }
}

module.exports = {
  DefaultEventDispatcher,
}
