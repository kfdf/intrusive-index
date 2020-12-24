interface IndexGenerator<T> extends Generator<T> {
  moveNext: () => boolean;
  current: T | null;
}
export interface IntrusiveIndex<T> {
  clear(): void;
  size: number;
  add(value: T): boolean;
  insert(value: T): T | null;
  delete(value: T): T | null;
  deleteAt(pos: number): T | null;
  get(valueOrComparer: (T | ((a: T) => number))): T | null;
  getAt(pos: number): T | null;
  findRange(comparer: (a: T) => number): { start: number, end: number};
  enumerate (comparer: (a: T) => number, reversed?: boolean): IndexGenerator<T>
  enumerateRange(start?: number, end?: number, reversed?: boolean): IndexGenerator<T>
}
interface IndexConstructor {
  new <T>(comparer: (a: T, b: T) => number): IntrusiveIndex<T>
  l: symbol;
  r: symbol;
  d: symbol;
}
export default function constructorFactory(): IndexConstructor;
export const IIA: IndexConstructor;
export const IIB: IndexConstructor;
export const IIC: IndexConstructor;
export const IID: IndexConstructor;
export const IIE: IndexConstructor;
export const IIF: IndexConstructor;

export class Transaction {
  add<T>(index: IntrusiveIndex<T>, item: T): boolean;
  insert<T>(index: IntrusiveIndex<T>, item: T): T | null;
  delete<T>(index: IntrusiveIndex<T>, item: T): T | null;
  deleteAt<T>(index: IntrusiveIndex<T>, pos: number): T | null;
  replace<T>(index: IntrusiveIndex<T>, item: T, replacee: T): boolean;
  rollback(): void;
}
