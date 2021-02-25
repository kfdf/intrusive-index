export class IndexIterator<T> {
  nextValue(): T | undefined
  next(): IteratorResult<T, undefined>
  [Symbol.iterator](): IndexIterator<T>
  static from<T>(iterable: Iterable<T>): IndexIterator<T>  
  into<U>(callback: (generator: IndexIterator<T>) => U) : U
  toArray(): T[]
  forEach(callback: (value: T, i: number) => void): void
  reduce<U>(operation: (accum: U, value: T, i: number) => U, initial: U): U
  reduce(operation: (accum: T, value: T, i: number) => T): T
  map<U>(transform: (value: T, i: number) => U): IndexIterator<U>
  filter(predicate: (value: T, i: number) => boolean): IndexIterator<T>
  flatten(): IndexIterator<T extends Iterable<infer U> ? U : T>
  skip(count: number): IndexIterator<T>
  take(count: number): IndexIterator<T>
  fallback<U>(value: U) : IndexIterator<T> | IndexIterator<U>
  concat(value: T): IndexIterator<T>
  concat(value: Iterable<T>): IndexIterator<T>
  sort(comparator: (a: T, b: T) => number): IndexIterator<T>
  reverse(): IndexIterator<T>
  segment(comparator: (a: T, b: T) => number): IndexIterator<IndexIterator<T>>
  group(comparator: (a: T, b: T) => number): IndexIterator<IndexIterator<T>>
}

declare interface Range<T> {
  start: number
  end: number
  atStart: T | undefined
  preEnd: T | undefined
}
declare type FullRange<T, O> = 
  O extends 'full' ? Range<T> & { preStart: T | undefined; atEnd: T | undefined } :
  O extends 'start' ? Range<T> & { preStart: T | undefined } :
  O extends 'end' ? Range<T> & { atEnd: T | undefined } : Range<T>

declare type Order = 'asc' | 'desc'
declare type RangeOption = 'any' | 'start' | 'end' | 'full'
export interface IntrusiveIndex<T extends U, U = T> {
  readonly comp: (a: U, b: U) => number
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(key: U): T | null
  delete(comparator: (a: U) => number): T | null
  deleteAt(offset: number): T | null
  get(key: U): T | undefined
  get(comparator: (a: U) => number): T | undefined
  getAt(offset: number): T | undefined
  findRange<O extends RangeOption = 'full'>(comparator: (a: U) => number, option?: O): FullRange<T, O>
  findRange<O extends RangeOption = 'any'>(key: U, option?: O): FullRange<T, O>
  enumerate(start: number, end: number, order?: Order): IndexIterator<T>
  enumerate(start: number, order?: Order): IndexIterator<T>
  enumerate(order?: Order): IndexIterator<T>
  enumerate(comparator: (a: U) => number, order?: Order): IndexIterator<T>
  into<K>(callback: (ii: IntrusiveIndex<T, U>) => K) : K
  setRoot(root: T): void
}
export interface IndexConstructor {          
  new <T extends U, U = T>(comparator: (a: U, b: U) => number): IntrusiveIndex<T, U>
  readonly l: symbol
  readonly r: symbol
  readonly d: symbol
}
export default function constructorFactory(): IndexConstructor
export const IIA: IndexConstructor
export const IIB: IndexConstructor
export const IIC: IndexConstructor
export const IID: IndexConstructor
export const IIE: IndexConstructor
export const IIF: IndexConstructor

export function createFactory(): () => IndexConstructor
export class TransactionBase {
  readonly journal: {
    readonly savepoints: number[]
    readonly indexes: IntrusiveIndex<any>[]
    readonly removals: any[]
    readonly inserts: any[]
  }
  add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, comparator: (a: U) => number): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, offset: number): T | null
  savepoint(): void
  release(): void
  rollback(): boolean
}
export {}
