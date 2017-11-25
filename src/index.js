// @flow

export type * from './es/interfaces'
export type * from './es/driver-interfaces'
export type * from './config/config'

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

