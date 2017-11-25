// @flow

import type { PersistedState } from './interfaces'

export type Event<M> = {
  +v: number;
  +message: M;
}

export type RState<S> = {
  +v: number;
  +state: S;
}

export interface EventStore<M> {
  replayEvents(v: number, cb: (event: Event<M>) => void): Promise<void>;
  createEvent(message: M): Promise<Event<M>>;
}

export interface StateStore<S> {
  +persistedState: PersistedState<S>;
  restoreState(): Promise<RState<S>>;
  updateState(rstateOld: RState<S>, rstate: RState<S>): Promise<void>;
}

export interface SnapshotStore<S> {
  +persistedState: PersistedState<S>;
  restoreSnapshot(v: number): Promise<RState<S>>;
  saveSnapshot(rstate: RState<S>): Promise<void>;
}

export interface MessageProducer<T> {
  init(produce: (message: T) => Promise<void>): Promise<void>;
}

export interface MessageConsumer<T> {
  consume(message: T): Promise<void>;
}
