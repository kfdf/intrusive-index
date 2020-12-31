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

export interface Range<T> {
  start: number
  end: number
  beforeStart: T | null
  afterStart: T | null
  beforeEnd: T | null
  afterEnd: T | null
  readonly size: number
  readonly first: T | null
  readonly last: T | null
}

declare type SubRange = 'full' | 'start' | 'end' | 'any'
declare type EnumerationOrder = 'asc' | 'desc'
export interface IntrusiveIndex<T extends U, U = T> {
  readonly comp: (a: U, b: U) => number
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(key: U): T | null
  deleteAt(pos: number): T | null
  get(key: U): T | null
  get(predicate: (a: U) => number): T | null
  getAt(pos: number): T | null
  findRange(predicate: (a: U) => number, subRange?: SubRange ): Range<T>
  enumerate(predicate: (a: U) => number, order?: EnumerationOrder): IndexIterator<T>
  enumerate(start: number, end: number, order?: EnumerationOrder): IndexIterator<T>
  enumerate(start: number, order?: EnumerationOrder): IndexIterator<T>
  enumerate(order?: EnumerationOrder): IndexIterator<T>
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
    indexes: IntrusiveIndex<any>[]
    removals: any[]
    inserts: any[]
  }
  add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, pos: number): T | null
  replace<T>(index: IntrusiveIndex<T, any>, value: T, replacee: T): boolean
  rollback(): void
}
export {}
