// @flow

export type Process<C, M> = (cmd: C) => Promise<M>;

export type Reduce<M, S> = (state: S, message: M) => S

export interface PersistedState<S> {
  +stateId: string;
  +empty: S;
}

export interface Reducer<M, S> extends PersistedState<S> {
  +reduce: Reduce<M, S>;
}
