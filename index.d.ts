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
declare type FullRange<T, O> = 
  O extends 'full' ? Range<T> & { preStart: T | null; atEnd: T | null } :
  O extends 'start' ? Range<T> & { preStart: T | null } :
  O extends 'end' ? Range<T> & { atEnd: T | null } : Range<T>

declare type Order = 'asc' | 'desc'
declare type RangeOption = 'any' | 'start' | 'end' | 'full'
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
  getAny(predicate: (a: U) => number): T | null
  getAt(pos: number, cache?: boolean | number): T | null
  findRange<O extends RangeOption = 'full'>(predicate: (a: U) => number, option?: O): FullRange<T, O>
  findRange<O extends RangeOption = 'any'>(key: U, option?: O): FullRange<T, O>
  enumerate(start: number, end: number, order?: Order): IndexIterator<T>
  enumerate(start: number, order?: Order): IndexIterator<T>
  enumerate(order?: Order): IndexIterator<T>
  enumerate(predicate: (a: U) => number, order?: Order): IndexIterator<T> & {
    setNext(predicate: (a: U) => number): void
  }
  into<K>(func: (ii: IntrusiveIndex<T, U>) => K) : K
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
