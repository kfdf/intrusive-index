interface IndexGenerator<T> extends Generator<T> {
  moveNext: () => boolean
  current: T | null
}
interface Comparator<T> {
  (a: T, b: T): number
}
interface Predicate<T> {
  (a: T): number
}
export interface IntrusiveIndex<T extends U, U = T> {
  readonly comp: Comparator<U>
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(key: U): T | null
  deleteAt(pos: number): T | null
  get(value: U): T | null
  get(predicate: Predicate<U>): T | null
  getAt(pos: number): T | null
  findRange(predicate: Predicate<U>): { start: number, end: number}
  enumerate(predicate: Predicate<U>, reversed?: boolean): IndexGenerator<T>
  enumerate(start?: number, end?: number, reversed?: boolean): IndexGenerator<T>
}
interface IndexConstructor {          
  new <T extends U, U = T>(comparator: Comparator<U>): IntrusiveIndex<T, U>
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

interface Journal {
  indexes: IntrusiveIndex<any>[]
  removals: any[]
  inserts: any[]
}
export class Transaction {
  readonly journal: Journal
  add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, pos: number): T | null
  replace<T>(index: IntrusiveIndex<T, any>, value: T, replacee: T): boolean
  rollback(): void
}
