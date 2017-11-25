// @flow

// FIXME
/** *import type { MongoClient, Collection } from 'mongodb' */
import type { PersistedState } from '../es/interfaces'

import type {
  Event, RState,
  EventStore, StateStore, SnapshotStore,
} from '../es/driver-interfaces'

// Mongo Storage Driver Impl

const { getNextSequence } = require('mongodb-autoincrement')
const update = require('mongo-diff-update')

class MongoStateStore<S> implements StateStore<S> {
  _collection: any/** *: Collection */
  persistedState: PersistedState<S>

  constructor(
    mdb: any/** *: MongoClient */,
    collectionName: string,
    persistedState: PersistedState<S>
  ) {
    this._collection = mdb.collection(collectionName)
    this.persistedState = persistedState
    this._collection.ensureIndex('stateId', { unique: true })
  }

  restoreState(): Promise<RState<S>> {
    // $FlowFixMe
    return this._collection.findOne({ stateId: this.persistedState.stateId })
      .then(rstate => {
        if (rstate == null) {
          console.log(`No state found with id ${this.persistedState.stateId}, using empty state`)
          return {
            v: 0,
            state: this.persistedState.empty,
          }
        } else {
          delete rstate._id
          return rstate
        }
      })
  }

  saveState(rstate: RState<S>): Promise<void> {
    console.log(`Persisting state ${JSON.stringify(rstate)}`)
    return this._collection.findOneAndReplace(
      { stateId: this.persistedState.stateId },
      rstate,
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
      console.log(`Update info ${JSON.stringify(info)}`)
      if (!info.lastErrorObject.updatedExisting) {
        console.log(`Update failed no matching persisted state, making a full persist`)
        return this.saveState(rstate)
      }
    })
  }
}

class MongoSnapshotStore<S> implements SnapshotStore<S> {
  persistedState: PersistedState<S>
  _collection: any/** *: Collection */

  constructor(
    mdb: any/** *: MongoClient */,
    collectionName: string,
    persistedState: PersistedState<S>,
  ) {
    this.persistedState = persistedState
    this._collection = mdb.collection(collectionName)
    this._collection.ensureIndex([ 'stateId', ['v', 1] ], { unique: true })
  }

  restoreSnapshot(v: number): Promise<RState<S>> {
    // $FlowFixMe
    return this._collection.findOne(
      { stateId: this.persistedState.stateId, v: { $lte: v } },
      { sort: [ ['v', 1] ] }
    ).then(rstate => {
      if (rstate == null) {
        console.log(`No snapshot found with id ${this.persistedState.stateId} before ${v}, using empty state`)
        return {
          v: 0,
          state: this.persistedState.empty,
        }
      } else {
        delete rstate._id
        return rstate
      }
    })
  }

  saveSnapshot(rstate: RState<S>): Promise<void> {
    return this._collection.save(rstate)
  }
}

class MongoEventStore<M> implements EventStore<M> {
  _mdb: any/** *: MongoClient */
  _collectionName: string
  _collection: any/** *: Collection */

  constructor(mdb: any/** *: MongoClient */, collectionName: string) {
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
