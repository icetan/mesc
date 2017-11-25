// @flow

import type {
  Event,
  MessageProducer, MessageConsumer, EventStore,
} from './driver-interfaces'

// Impl

class EventDispatcher<M> {
  dispatch(
    messageProducer: MessageProducer<M>,
    eventConsumer: MessageConsumer<Event<M>>,
    eventStore: EventStore<M>,
  ) {
    const store = (message: M) =>
      eventStore.createEvent(message)
        .then(event => { eventConsumer.consume(event) })

    messageProducer.init(store)
  }
}

module.exports = {
  EventDispatcher,
}
