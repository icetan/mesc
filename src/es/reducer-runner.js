// @flow

import type {
  RState, Event,
  MessageProducer,
  EventStore, StateStore, SnapshotStore,
} from './driver-interfaces'

import type { Reducer } from './interfaces'

// Impl

class ReducerRunner<M, S> {
  // Latches
  _started: boolean
  _initialized: boolean
  // ensure no events are reduced while catching up.
  _catchingup: boolean

  _reducer: Reducer<M, S>
  _eventProducer: MessageProducer<Event<M>>
  _eventStore: EventStore<M>
  _stateStore: StateStore<S>
  _snapshotStore: SnapshotStore<S>

  _rstate: RState<S>

  constructor(
    reducer: Reducer<M, S>,
    eventProducer: MessageProducer<Event<M>>,
    eventStore: EventStore<M>,
    stateStore: StateStore<S>,
    snapshotStore: SnapshotStore<S>,
  ) {
    this._started = false
    this._initialized = false
    this._catchingup = false
    this._reducer = reducer
    this._eventProducer = eventProducer
    this._eventStore = eventStore
    this._stateStore = stateStore
    this._snapshotStore = snapshotStore
  }

  // pure
  _reduceRstate(rstate: RState<S>, event: Event<M>): RState<S> {
    if (rstate.v !== event.v - 1) {
      console.warn(`Warning: reducing event ${event.v} that is ahead current state ${rstate.v}`)
    }
    return {
      v: event.v,
      state: this._reducer.reduce(rstate.state, event.message),
    }
  }

  // pure
  async _catchup(rstate: RState<S>): Promise<RState<S>> {
    return this._eventStore.replayEvents(rstate.v, event => {
      console.log(`Found event ${event.v}`)
      rstate = this._reduceRstate(rstate, event)
    }).then(() => rstate)
  }

  async _restoreCatchupAndSave(v: ?number): Promise<void> {
    if (this._catchingup) {
      throw new Error('Already catching up')
    }
    // Latch on to prevent reduction while catching up.
    this._catchingup = true
    console.log(`Restoring from ${this._rstate.v}`)

    const catchup_ = async rstate_ => {
      const rstateOld = this._rstate
      console.log(`Catching up from ${rstateOld.v}`)
      this._rstate = await this._catchup(rstate_)

      console.log(`Cought up to ${this._rstate.v} from ${rstateOld.v}`)

      // FIXME: maybe driver should choose to persist or not
      console.log(`old v:${rstateOld.v}, new v:${this._rstate.v}`)
      if (rstateOld.v !== this._rstate.v) {
        await this._stateStore.updateState(rstateOld, this._rstate)
      }
    }

    const restore = async() => {
      if (v !== null && v !== undefined) {
        if (this._rstate.v === v - 1) {
          // already cought up, do nothing
        } else if (this._rstate.v >= v) {
          // state is ahead of event: drop invalid state and restore from snapshot
          console.warn(`Warning: ${v} is behind local state ${this._rstate.v}, restoring from snapshot`)
          const rstate_ = await this._snapshotStore.restoreSnapshot(v)
          console.log(`Restored from snapshot ${rstate_.v}`)
          await catchup_(rstate_)
        } else {
          await catchup_(this._rstate)
        }
      } else {
        await catchup_(this._rstate)
      }
    }

    try {
      await restore()
    } finally {
      this._catchingup = false
    }
  }

  async init(): Promise<void> {
    if (this._started) {
      throw new Error('Runner already started')
    }
    // Latch to prevent initing more than once.
    this._started = true

    // restore from state store first
    // TODO: should pass in empty and stateId maybe?
    this._rstate = await this._stateStore.restoreState()

    // look for unprocessed events after persisted state is restored.
    await this._restoreCatchupAndSave()

    this._initialized = true

    const reduce = async(event: Event<M>): Promise<void> => {
      if (this._catchingup) {
        console.warn('In the middle of catching up, ignoring event')
      } else if (this._rstate.v === event.v - 1) {
        const rstateOld = this._rstate
        this._rstate = this._reduceRstate(rstateOld, event)
        await this._stateStore.updateState(rstateOld, this._rstate)
      } else {
        await this._restoreCatchupAndSave(event.v)
      }
    }

    await this._eventProducer.init(reduce)
  }
}

module.exports = {
  ReducerRunner,
}
