// @flow

// FIXME
import type { MongoClient, Collection } from 'mongodb'
import type { PersistedState } from '../es/interfaces'

import type {
  Event, RState,
  EventStore, StateStore, SnapshotStore,
} from '../es/driver-interfaces'

// Mongo Storage Driver Impl

const { getNextSequence } = require('mongodb-autoincrement')
const update = require('mongo-diff-update')

class MongoStateStore<S> implements StateStore<S> {
  _collection: Collection
  persistedState: PersistedState<S>

  constructor(
    mdb: MongoClient,
    collectionName: string,
    persistedState: PersistedState<S>
  ) {
    this._collection = mdb.collection(collectionName)
    this.persistedState = persistedState
    this._collection.ensureIndex('stateId', { unique: true })
  }

  restoreState(): Promise<RState<S>> {
    return this._collection.findOne({ stateId: this.persistedState.stateId })
      .then(rstate => {
        if (rstate == null) {
          console.log(`No state found with id ${this.persistedState.stateId}, using empty state`)
          return { v: 0, state: this.persistedState.empty }
        } else {
          return { v: rstate.v, state: rstate.state }
        }
      })
  }

  _saveState(rstate: RState<S>): Promise<void> {
    console.log(`Persisting state ${JSON.stringify(rstate)}`)
    return this._collection.findOneAndReplace(
      { stateId: this.persistedState.stateId },
      {
        stateId: this.persistedState.stateId,
        v: rstate.v,
        state: rstate.state,
      },
      { upsert: true, returnOriginal: false }
    )
  }

  updateState(rstateOld: RState<S>, rstate: RState<S>): Promise<void> {
    const query = update(rstateOld, rstate)

    if (Object.keys(query).length === 0) {
      console.log(`Updating state: diff is empty ${JSON.stringify(query)}, skipping`)
      return Promise.resolve()
    }

    console.log(`Updating state ${JSON.stringify(query)}`)

    return this._collection.findOneAndUpdate(
      { stateId: this.persistedState.stateId, v: rstateOld.v },
      query,
    ).then(info => {
      if (!info.lastErrorObject.updatedExisting) {
        console.log(`Update failed no matching persisted state, making a full persist`)
        return this._saveState(rstate)
      }
    })
  }
}

class MongoSnapshotStore<S> implements SnapshotStore<S> {
  persistedState: PersistedState<S>
  _collection: Collection

  constructor(
    mdb: MongoClient,
    collectionName: string,
    persistedState: PersistedState<S>,
  ) {
    this.persistedState = persistedState
    this._collection = mdb.collection(collectionName)
    this._collection.ensureIndex([ 'stateId', ['v', 1] ], { unique: true })
  }

  restoreSnapshot(v: number): Promise<RState<S>> {
    return this._collection.findOne(
      { stateId: this.persistedState.stateId, v: { $lte: v } },
      { sort: [ ['v', 1] ] }
    ).then(state => {
      if (state == null) {
        console.log(`No snapshot found with id ${this.persistedState.stateId} before ${v}, using empty state`)
        return { v: 0, state: this.persistedState.empty }
      } else {
        return { v: state.v, state: state.state }
      }
    })
  }

  saveSnapshot(rstate: RState<S>): Promise<void> {
    return this._collection.save({
      stateId: this.persistedState.stateId,
      v: rstate.v,
      state: rstate.state,
    })
  }
}

class MongoEventStore<M> implements EventStore<M> {
  _mdb: MongoClient
  _collectionName: string
  _collection: Collection

  constructor(mdb: MongoClient, collectionName: string) {
    this._mdb = mdb
    this._collectionName = collectionName
    this._collection = mdb.collection(collectionName)
    this._collection.ensureIndex(['v', 1], { unique: true })
  }

  replayEvents(start: number, cb: (e: Event<M>) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this._collection
        .find({ v: { $gt: start } })
        .sort({ v: 1 })
        .each((err, doc) => {
          if (err) { reject(err) } else if (doc == null) { resolve() } else { cb(doc) }
        })
    })
  }

  createEvent(message: M): Promise<Event<M>> {
    return new Promise((resolve, reject) => {
      getNextSequence(this._mdb, this._collectionName, (err, nextV) => {
        if (err) {
          reject(err)
        } else {
          const event: Event<M> = {
            v: nextV,
            message,
          }
          console.log(`Storing event ${event.v}`)
          resolve(this._collection.insertOne(event).then(() => {
            delete (event: any)._id
            return event
          }))
        }
      })
    })
  }
}

module.exports = {
  MongoEventStore,
  MongoStateStore,
  MongoSnapshotStore,
}
