class IndexGenerator<T> {
  moveNext: () => boolean
  current: T | null
  map<U>(transform: (value: T) => U): IndexGenerator<U>
  filter(predicate: (value: T) => boolean): IndexGenerator<T>
  flatten(transform: (value: T) => IndexGenerator<T>): IndexGenerator<T>
  flatten(transform: (value: T) => Iterable<T>): IndexGenerator<T>
  skipTake(skip: number, take?: number): IndexGenerator<T>
  wrap<T extends Function>(func: T): ReturnType<T>
  toArray(): T[]
  reduce<U>(operation: (accum: U, value: T, idx: number) => U, initial?: U): U
  next(): IteratorResult<number, undefined>
  [Symbol.iterator](): IndexGenerator<T>
}
export class Rator<T> extends IndexGenerator<T> {
  constructor(iterable: Iterable<T>)
}
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
  findRange(predicate: (a: U) => number): { start: number, end: number}
  enumerate(predicate: (a: U) => number, reversed?: boolean): IndexGenerator<T>
  enumerate(start?: number, end?: number, reversed?: boolean): IndexGenerator<T>
  enumerate(start?: number, reversed?: boolean): IndexGenerator<T>
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
