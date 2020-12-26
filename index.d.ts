interface IndexGenerator<T> extends Generator<T> {
  moveNext: () => boolean
  current: T | null
}
interface BinaryComp<T> {
  (a: T, b: T): number
}
interface UnaryComp<T> {
  (a: T): number
}
export interface IntrusiveIndex<T extends U, U = T> {
  readonly comp: BinaryComp<U>
  readonly size: number
  clear(): void
  add(value: T): boolean
  insert(value: T): T | null
  delete(key: U): T | null
  deleteAt(pos: number): T | null
  get(valueOrComparator: U | UnaryComp<U>): T | null
  getAt(pos: number): T | null
  findRange(comparator: UnaryComp<U>): { start: number, end: number}
  enumerate (comparator: UnaryComp<U>, reversed?: boolean): IndexGenerator<T>
  enumerateRange(start?: number, end?: number, reversed?: boolean): IndexGenerator<T>
}
interface IndexConstructor {          
  new <T extends U, U = T>(comparator: BinaryComp<U>): IntrusiveIndex<T, U>
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
  indexList: IntrusiveIndex<any>[]
  removedList: any[]
  insertedList: any[]
  add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
  insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
  delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
  deleteAt<T>(index: IntrusiveIndex<T, any>, pos: number): T | null
  replace<T>(index: IntrusiveIndex<T, any>, value: T, replacee: T): boolean
  rollback(): void
}
