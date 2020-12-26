interface IndexGenerator<T> extends Generator<T> {
  moveNext: () => boolean
  current: T | null
}
interface BinaryComparer<T> {
  (a: T, b: T): number
}
interface UnaryComparer<T> {
  (a: T): number
}
export interface IntrusiveIndex<T extends U, U = T> {
  readonly comparer: BinaryComparer<U>
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(value: U): T | null
  deleteAt(pos: number): T | null
  get(valueOrComparer: U | UnaryComparer<U>): T | null
  getAt(pos: number): T | null
  findRange(comparer: UnaryComparer<U>): { start: number, end: number}
  enumerate (comparer: UnaryComparer<U>, reversed?: boolean): IndexGenerator<T>
  enumerateRange(start?: number, end?: number, reversed?: boolean): IndexGenerator<T>
}
interface IndexConstructor {          
  new <T extends U, U = T>(comparer: BinaryComparer<U>): IntrusiveIndex<T, U>
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
  add<T>(index: IntrusiveIndex<T, any>, item: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, item: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, item: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, pos: number): T | null
  replace<T>(index: IntrusiveIndex<T, any>, item: T, replacee: T): boolean
  rollback(): void
}
