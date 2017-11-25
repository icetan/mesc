// @flow

export type {
  Process,
  Reduce,
  PersistedState,
  Reducer,
} from './es/interfaces'

export type {
  Event,
  RState,
  EventStore,
  StateStore,
  SnapshotStore,
  MessageProducer,
  MessageConsumer,
} from './es/driver-interfaces'

export type {
  EventSourceConfig
} from './config/config'

module.exports = {
  // Impl
  ...require('./es/reducer-runner'),
  ...require('./es/event-dispatcher'),
  ...require('./es/processor-router'),

  ...require('./config/default-reducer-runner'),
  ...require('./config/default-event-dispatcher'),
  ...require('./config/default-processor-router'),
  ...require('./config/config'),

  ...require('./drivers'),
}

