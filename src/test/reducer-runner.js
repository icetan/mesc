// @flow
import type {
  Event,
  EventStore,
  StateStore,
  SnapshotStore,
  MessageProducer,
} from '../es/driver-interfaces'

const t = require('tap')
const { ReducerRunner } = require('../es/reducer-runner')

async function main() {
  await t.test('ReducerRrunner should consume events pass to reduce and persist new state', async t => {
    let producerRun = false
    const event = { v: 1, message: 1 }

    const mockReducer = {
      stateId: 'A',
      empty: 0,
      reduce: (state, message) => {
        t.equal(event.message, message,
          'Messages given to runner by producer should be passed to reducer')
        return 1
      },
    }

    let sendEvent
    const mockProducer: MessageProducer<Event<number>> = {
      init: async produce => {
        t.notOk(producerRun,
          'Should only init producer once')
        producerRun = true
        sendEvent = produce
      },
    }

    const mockEventStore: EventStore<number> = {
      replayEvents: async(v, cb) => {
        t.equal(v, 0,
          'Runner should look for events starting from its init state')
      },
      createEvent: async(message) => ({ v: 0, message }),
    }

    const mockStateStore: StateStore<number> = {
      persistedState: mockReducer,
      restoreState: async() => {
        t.ok(true,
          'Should try to restore persisted state on init')
        return { v: 0, state: mockReducer.empty }
      },
      updateState: async(rstateOld, rstate) => {
        t.equal(rstateOld.state, 0,
          'Update old should be empty state')
        t.equal(rstate.state, 1,
          'Update state should be called with reducer output')
      },
    }

    const mockSnapshotStore: SnapshotStore<number> = {
      persistedState: mockReducer,
      restoreSnapshot: async(v) => {
        t.notOk(true,
          'Should NOT try to restore persisted snapshot, only if events consumed are behind current runner state')
        return { v, state: mockReducer.empty }
      },
      saveSnapshot: async(rstate) => {},
    }

    const reducerRunner: ReducerRunner<number, number> = new ReducerRunner(
      mockReducer,
      mockProducer,
      mockEventStore,
      mockStateStore,
      mockSnapshotStore,
    )

    t.plan(8)
    t.notOk(producerRun,
      'Producer init should not be called before runner init')

    await reducerRunner.init()

    if (sendEvent) {
      t.ok(producerRun,
        'Producer init called after runner init')
      sendEvent(event)
    }
  })

  await t.test('ReducerRrunner should atempt to replay event store from persisted state', async t => {
    let producerRun = false
    const startState = { v: 1, state: 1 }
    const endState = { v: 5, state: 5 }

    const mockReducer = {
      stateId: 'B',
      empty: 0,
      reduce: (state, message) => {
        t.equal(state, message - 1,
          'Messages given to runner by producer should be passed to reducer')
        return message
      },
    }

    const mockProducer: MessageProducer<Event<number>> = {
      init: async produce => {
        t.notOk(producerRun,
          'Should only init producer once')
        producerRun = true
      },
    }

    const mockEventStore: EventStore<number> = {
      replayEvents: async(v, cb) => {
        t.equal(v, 1,
          'Runner should look for events starting from its init runner count (v)')
        cb({ v: 2, message: 2 })
        cb({ v: 3, message: 3 })
        cb({ v: 4, message: 4 })
        cb({ v: 5, message: 5 })
      },
      createEvent: async(message) => ({ v: 0, message }),
    }

    const mockStateStore: StateStore<number> = {
      persistedState: mockReducer,
      restoreState: async() => {
        t.ok(true,
          'Should try to restore persisted state on init')
        return startState
      },
      updateState: async(rstateOld, rstate) => {
        t.same(rstateOld, startState,
          'Old state after persisted state restored')
        t.same(rstate, endState,
          'New state after replayed events')
      },
    }

    const mockSnapshotStore: SnapshotStore<number> = {
      persistedState: mockReducer,
      restoreSnapshot: async(v) => {
        t.notOk(true,
          'Should NOT try to restore persisted snapshot, only if events consumed are behind current runner state')
        return { v, state: mockReducer.empty }
      },
      saveSnapshot: async(rstate) => {},
    }

    const reducerRunner: ReducerRunner<number, number> = new ReducerRunner(
      mockReducer,
      mockProducer,
      mockEventStore,
      mockStateStore,
      mockSnapshotStore,
    )

    t.plan(11)
    t.notOk(producerRun,
      'Producer init should not be called before runner init')

    await reducerRunner.init()

    t.ok(producerRun,
      'Producer init called after runner init')
  })

  await t.test('ReducerRrunner should restore from snapshot if state is ahead of incoming event', async t => {
    let producerRun = false
    const startState = { v: 8, state: 8 }
    const endState = { v: 3, state: 3 }
    const event = { v: 5, message: 5 }

    const mockReducer = {
      stateId: 'C',
      empty: 0,
      reduce: (state, message) => {
        t.notOk(true,
          'Reducer should not be called on snapshot restore')
        return state
      },
    }

    let sendEvent
    const mockProducer: MessageProducer<Event<number>> = {
      init: async produce => {
        t.notOk(producerRun,
          'Should only init producer once')
        producerRun = true
        sendEvent = produce
      },
    }

    const mockEventStore: EventStore<number> = {
      replayEvents: async(v, cb) => { },
      createEvent: async message => ({ v: 0, message }),
    }

    const mockStateStore: StateStore<number> = {
      persistedState: mockReducer,
      restoreState: async() => {
        t.ok(true,
          'Should try to restore persisted state on init')
        return startState
      },
      updateState: async(rstateOld, rstate) => {
        t.same(rstateOld, startState,
          'Old state after persisted state restored')
        t.same(rstate, endState,
          'New state after replayed events')
      },
    }

    const mockSnapshotStore: SnapshotStore<number> = {
      persistedState: mockReducer,
      restoreSnapshot: async v => {
        t.equal(v, 5,
          'Should atempt to restore snapshot from before v 5')
        return endState
      },
      saveSnapshot: async rstate => {},
    }

    const reducerRunner: ReducerRunner<number, number> = new ReducerRunner(
      mockReducer,
      mockProducer,
      mockEventStore,
      mockStateStore,
      mockSnapshotStore,
    )

    t.plan(7)
    t.notOk(producerRun,
      'Producer init should not be called before runner init')

    await reducerRunner.init()

    if (sendEvent) {
      t.ok(producerRun,
        'Producer init called after runner init')
      await sendEvent(event)
    }
  })

  await t.test('ReducerRrunner should ignore events while catching up', async t => {
    let producerRun = false
    let restoreCount = 0
    const startState = { v: 0, state: 0 }
    const event = { v: 2, message: 2 }
    const ignoredEvent = { v: -1, message: -1 }

    const mockReducer = {
      stateId: 'D',
      empty: 0,
      reduce: (state, message) => {
        t.notOk(true,
          'Reducer should not be run for events in future')
        return message
      },
    }

    let sendEvent
    const mockProducer: MessageProducer<Event<number>> = {
      init: async produce => {
        t.notOk(producerRun,
          'Should only init producer once')
        producerRun = true
        sendEvent = produce
      },
    }

    let restorePromise = Promise.resolve()
    let resolveRestore
    const mockEventStore: EventStore<number> = {
      replayEvents: async(v, cb) => {
        t.equal(v, 0,
          'Should catch up from 0')
        restoreCount += 1
        await restorePromise
        restorePromise = new Promise((resolve, reject) => { resolveRestore = resolve })
      },
      createEvent: async message => ({ v: 0, message }),
    }

    const mockStateStore: StateStore<number> = {
      persistedState: mockReducer,
      restoreState: async() => {
        t.ok(true,
          'Should restore state once on init')
        return startState
      },
      updateState: async(rstateOld, rstate) => {
        t.notOk(true,
          'No changes in state v, should not persist state')
      },
    }

    const mockSnapshotStore: SnapshotStore<number> = {
      persistedState: mockReducer,
      restoreSnapshot: async v => {
        t.notOk(true,
          'Should not restore snapshot')
        return startState
      },
      saveSnapshot: async rstate => {},
    }

    const reducerRunner: ReducerRunner<number, number> = new ReducerRunner(
      mockReducer,
      mockProducer,
      mockEventStore,
      mockStateStore,
      mockSnapshotStore,
    )

    t.plan(8)
    t.notOk(producerRun,
      'Producer init should not be called before runner init')

    await reducerRunner.init()
    if (resolveRestore) resolveRestore()

    if (sendEvent) {
      t.ok(producerRun,
        'Producer init called after runner init')
      sendEvent(event)
      sendEvent(ignoredEvent) // This event should be ignored
      if (resolveRestore) {
        t.ok(true,
          'After send event should resolve restore promise')
        t.equal(restoreCount, 2,
          'Restore state should be run twice, first on init and on the first sent event, skippning the second')
        resolveRestore()
      }
    }
  })
}

main()
