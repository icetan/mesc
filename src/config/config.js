// @flow

export type EventSourceConfig = {
  MONGO_STATE_URL: string;
  MONGO_STATE_COLLECTION: string;
  MONGO_SNAPSHOT_URL: string;
  MONGO_SNAPSHOT_COLLECTION: string;
  MONGO_EVENT_URL: string;
  MONGO_EVENT_COLLECTION: string;
  REDIS_EVENT_URL: string;
  REDIS_EVENT_CHANNEL: string;
  PROCESSOR_URL: string;
  PROCESSOR_PORT: number;
  EVENT_DISPATCHER_URL: string;
  EVENT_DISPATCHER_PORT: number;
}

const DEFAULT_MONGO_URL = 'mongodb://localhost:27017/esc'
const DEFAULT_REDIS_URL = 'redis://localhost:6379/0'

const config = (opts: ?any): EventSourceConfig => {
  const opts_ = opts || {}
  return {
    MONGO_STATE_URL: opts_.MONGO_STATE_URL || DEFAULT_MONGO_URL,
    MONGO_STATE_COLLECTION: opts_.MONGO_STATE_COLLECTION || 'states',
    MONGO_SNAPSHOT_URL: opts_.MONGO_SNAPSHOT_URL || DEFAULT_MONGO_URL,
    MONGO_SNAPSHOT_COLLECTION: opts_.MONGO_SNAPSHOT_COLLECTION || 'snapshots',
    MONGO_EVENT_URL: opts_.MONGO_EVENT_URL || DEFAULT_MONGO_URL,
    MONGO_EVENT_COLLECTION: opts_.MONGO_EVENT_COLLECTION || 'events',
    REDIS_EVENT_URL: opts_.REDIS_EVENT_URL || DEFAULT_REDIS_URL,
    REDIS_EVENT_CHANNEL: opts_.REDIS_EVENT_CHANNEL || 'REDUCE_EVENT',
    PROCESSOR_URL: opts_.PROCESSOR_URL || 'http://localhost:8181',
    PROCESSOR_PORT: opts_.PROCESSOR_PORT != null
      ? parseInt(opts_.PROCESSOR_PORT) : 8181,
    EVENT_DISPATCHER_URL: opts_.EVENT_DISPATCHER_URL || 'http://localhost:8182',
    EVENT_DISPATCHER_PORT: opts_.EVENT_DISPATCHER_PORT != null
      ? parseInt(opts_.EVENT_DISPATCHER_PORT) : 8182,
  }
}

module.exports = { config }
