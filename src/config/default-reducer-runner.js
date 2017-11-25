// @flow

import type { Reducer } from '../es/interfaces'

export type Config = {
  MONGO_EVENT_URL: string;
  MONGO_EVENT_COLLECTION: string;
  MONGO_STATE_URL: string;
  MONGO_STATE_COLLECTION: string;
  MONGO_SNAPSHOT_URL: string;
  MONGO_SNAPSHOT_COLLECTION: string;
  REDIS_EVENT_URL: string;
  REDIS_EVENT_CHANNEL: string;
}

// Impl

const redis = require('redis')
const mongodb: any = require('mongodb')

const {
  RedisMessageProducer,
  MongoEventStore,
  MongoStateStore,
  MongoSnapshotStore,
} = require('../drivers')

const { ReducerRunner } = require('../es/reducer-runner')

class DefaultReducerRunner<M, S> {
  async run(reducer: Reducer<M, S>, c: Config) {
    const sub = redis.createClient(c.REDIS_EVENT_URL)
    const eventDb = await mongodb.connect(c.MONGO_EVENT_URL)
    const stateDb = await mongodb.connect(c.MONGO_STATE_URL)
    const snapshotDb = await mongodb.connect(c.MONGO_SNAPSHOT_URL)

    const runner: ReducerRunner<M, S> = new ReducerRunner(
      reducer,
      new RedisMessageProducer(sub, c.REDIS_EVENT_CHANNEL),
      new MongoEventStore(eventDb, c.MONGO_EVENT_COLLECTION),
      new MongoStateStore(stateDb, c.MONGO_STATE_COLLECTION, reducer),
      new MongoSnapshotStore(snapshotDb, c.MONGO_SNAPSHOT_COLLECTION, reducer),
    )

    runner.init()
  }
}

module.exports = {
  DefaultReducerRunner,
}
