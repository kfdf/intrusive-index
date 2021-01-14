export class IndexIterator<T> {
  moveNext(): boolean
  current: T | null
  map<U>(transform: (value: T) => U): IndexIterator<U>
  filter(predicate: (value: T) => boolean): IndexIterator<T>
  flatten(): IndexIterator<T extends Iterable<infer U> ? U : T>
  skipTake(skip: number, take?: number): IndexIterator<T>
  fallback<U>(value: U) : IndexIterator<T> | IndexIterator<U>
  into<U>(func: (generator: IndexIterator<T>) => U) : U
  toArray(): T[]
  forEach(callback: (value: T) => void): void
  reduce<U>(operation: (accum: U, value: T) => U, initial: U): U
  reduce(operation: (accum: T, value: T) => T): T
  next(): IteratorResult<T, undefined>
  [Symbol.iterator](): IndexIterator<T>
  static from<T>(iterable: Iterable<T>): IndexIterator<T>
}

declare interface Range<T> {
  start: number
  end: number
  atStart: T | null
  preEnd: T | null
}
declare type EndRange<T, E> = E extends true ? 
  Range<T> & { atEnd: T | null } : Range<T>
declare type FullRange<T, S, E> = S extends true ? 
  EndRange<T, E> & { preStart: T | null } : EndRange<T, E>


export interface IntrusiveIndex<T extends U, U = T> {
  readonly comp: (a: U, b: U) => number
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(key: U): T | null
  delete(predicate: (a: U) => number): T | null
  deleteAt(pos: number): T | null
  get(key: U): T | null
  get(predicate: (a: U) => number): T | null
  getAt(pos: number, cache?: boolean | number): T | null
  findRange<S extends boolean = true, E extends boolean = true>(
    predicate: (a: U) => number, start?: S, end?: E): FullRange<T, S, E>
  findRange<S extends boolean = false, E extends boolean = false>(
    key: U, start?: S, end?: E): FullRange<T, S, E>
  enumerate(start: number, end: number, reverse?: boolean): IndexIterator<T>
  enumerate(start: number, reverse?: boolean): IndexIterator<T>
  enumerate(reverse?: boolean): IndexIterator<T>
  enumerate(predicate: (a: U) => number, reverse?: boolean): IndexIterator<T> & {
    setNext(predicate: (a: U) => number): void
  }
}
export interface IndexConstructor {          
  new <T extends U, U = T>(comparator: (a: U, b: U) => number): IntrusiveIndex<T, U>
  l: symbol
  r: symbol
  d: symbol
}
export default function constructorFactory(): IndexConstructor
export const IIA: IndexConstructor
export const IIB: IndexConstructor
export const IIC: IndexConstructor
export const IID: IndexConstructor
export const IIE: IndexConstructor
export const IIF: IndexConstructor

export function createFactory(): () => IndexConstructor
export class Transaction {
  readonly journal: {
    savepoints: number[]
    indexes: IntrusiveIndex<any>[]
    removals: any[]
    inserts: any[]
  }
  add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, predicate: (a: U) => number): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, pos: number): T | null
  savepoint(): void
  release(): void
  rollback(): boolean
}
export {}
