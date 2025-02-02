# Intrusive Index

A data structure is intrusive if the information required to store the data is embedded inside the data itself. This allows a single data item to be stored in multiple data structures simultaneously without the overhead of additional allocations.

## Why

To get some practice with web technologies, javascript, data structures, and I wanted a *simple* way to work with in-memory tabular data that allows efficient sql/linq-like querying, pagination and modification. 

## Installation

```
npm install intrusive-index
```

## Example Usage

```js
import { Sequence, IIA, IIB, IIC } from 'intrusive-index'

let depPk = new IIA((a, b) => 
  a.depId - b.depId)
let empPk = new IIA((a, b) => 
  a.empId - b.empId)
let empDepFk = new IIB((a, b) => 
  depPk.comp(a, b) || 
  empPk.comp(a, b))
let empManagerIx = new IIC((a, b) => 
  a.managerId - b.managerId || 
  empPk.comp(a, b))

depPk.add({ depId: 1, name: 'dep #1' })
depPk.add({ depId: 3, name: 'dep #3' })
depPk.add({ depId: 2, name: 'dep #2' })

empPk.add({ empId: 3, depId: 1, name: 'emp #3', managerId: null })
empPk.add({ empId: 2, depId: 2, name: 'emp #2', managerId: 4 })
empPk.add({ empId: 7, depId: 2, name: 'emp #7', managerId: 6 })
empPk.add({ empId: 1, depId: 1, name: 'emp #1', managerId: 3 })
empPk.add({ empId: 4, depId: 2, name: 'emp #4', managerId: null })
empPk.add({ empId: 6, depId: 2, name: 'emp #6', managerId: 2 })
empPk.add({ empId: 5, depId: 2, name: 'emp #5', managerId: 4 })

for (let emp of empPk.enumerate()) {
  empDepFk.add(emp)
  empManagerIx.add(emp)
}
console.log('List of all employees and their departments')
console.log('inner join')
empPk
  .enumerate()
  .map(emp => ({ emp, dep: depPk.get(emp) }))
  .forEach(a => console.log(a.dep.name, a.emp.name))

console.log('outer join')
depPk
  .enumerate()
  .map(dep => empDepFk
    .enumerate(a => depPk.comp(a, dep))
    .fallback(null)
    .map(emp => ({ emp, dep })))
  .flatten()
  .map(a => a.dep.name + ' - ' + (a.emp ? a.emp.name : 'no eployees'))
  .forEach(row => console.log(row))
// dep #1 - emp #1
// dep #1 - emp #3
// dep #2 - emp #2
// dep #2 - emp #4
// dep #2 - emp #5
// dep #2 - emp #6
// dep #2 - emp #7
// dep #3 - no eployees

console.log('List of employees who report to employee #4')
function prepend(value) {
  return seq => Sequence.from([value, seq]).flatten()
}
function getSubordinates(a) {
  return empManagerIx
    .enumerate(e => e.managerId - a.emp.empId)
    .map(emp => getSubordinates({ emp, man: a.emp }))
    .flatten()
    .into(prepend(a))
}
getSubordinates({ emp: empPk.get({ empId: 4 }) })
  .map(a => a.emp.name + (a.man ? ' reports to ' + a.man.name : ''))
  .forEach(row => console.log(row))
// emp #4
// emp #2 reports to emp #4
// emp #6 reports to emp #2
// emp #7 reports to emp #6
// emp #5 reports to emp #4
```

## Example Project

The API is small, low level and somewhat footguny, so the `example` folder in the repository contains an express webapp. Initally I thought to implement the local library example from MDN, but then I just happened on some data that I believe was scraped from Touhou Fandom Wiki somewhere around 2013 and put into an SQL Server. Perhaps not the most suitable foundation for a CRUD app, but I *really* wanted to use the data... It is quite small, just a few hundred rows across all the tables, but the example is written as if there were hundreds of thousands, or even millions of rows (the reasonable maximum for this sort of storage). So the features are:
- Pagination everywhere
- No client-side scripting or even html validation, for illustrative purposes
- No sessions
- *Everything* is editable, but with the above limitations it can be awkward
- All edits are validated, and any errors are reported to the user
- The database state (tables, views, fts) is updated immediately and synchronously
- Full text search, quite simplistic, but not useless
- All changes are persisted in csv files

## Library Exports

The library exposes three classes and two methods. The primary class is `IntrusiveIndex`, and the two helper classes are `Sequence` and `TransactionBase`, they can assist with data querying and editing. The two methods, that are probably never needed, are `constructorFactory` which is the default export and `createFactory`. All methods and functions are synchronous, and never explicitly throw any errors.

## IntrusiveIndex

The `IntrusiveIndex` constructor is not exported directly, but variants of it can be created by `constructorFactory`, also six prefabricated constructors are provided for convenience. The index uses the AVL tree that additionally tracks items offsets. All methods are non-batching and have logarithmic time complexity. Declarations below make use of two generic parameters, `TValue` and `TKey`, which, for example, in case of the `empManagerIx` index are: `{ empId: number, depId: number, name: string, managerId: number }` and `{ managerId: number, empId: number }`. Actually, the type of the `managerId` field should be `number | null` but javascript coercion works well in this case converting nulls to zeroes and typescript can be overly pedantic.

### keys

```ts
static l: Symbol
static r: Symbol
static d: Symbol
```

The index "injects" three fields into each item that is stored in it (so it adds 24 bytes per item, or 12 with pointer compression). The keys of the fields are exposed as static properties, with the inteded use is to "pre-initialize" items that will be added to the index to avoid additional internal allocations. So the above example is somewhat inefficient, a more proper way of creating rows is to add this boilerplate

```js
function Employee(empId, depId, name, managerId) {
  this.empId = empId
  this.depId = depId
  this.name = name
  this.managerId = managerId
  this[IIA.l] = this[IIB.l] = this[IIC.l] = null
  this[IIA.r] = this[IIB.r] = this[IIC.r] = null
  this[IIA.d] = this[IIB.d] = this[IIC.d] = -1
}
```

This creates a flat object that is (3 + 4 + 3 * 3) * 8 = 128 bytes in size. Property values don't seem to matter, but setting [d] to -1 can be used to verify that the row is properly added and removed from all indexes of a table. When a row is removed from an index (replaced or deleted) the [l] and [r] properties are set to null, and [d] is set to -1.

### constructor

```ts
constructor(comparator: (a: TKey, b: TKey) => number)
comp: (a: TKey, b: TKey) => number
```

A comparator that is provided to define item ordering is also available as the `comp` property of the index. It can be used create unary comparators that define ranges in child tables, like so:

```js
let childRows = childParentFk
  .enumerate(child => parentPk.comp(child, parentRow))
```

Conversely, to `get` a parent row a child row can be used as the key:

```js
let parentRow = parentPk.get(childRow)
```

Such "natural" joins work if primary keys are be prefixed with table names, so that both tables can be joined on the identically named columns. Otherwise, these two examples would have been:

```js
let childRows = childParentFk
  .enumerate(child => child.parentId - parentRow.id)
let parentRow = parentPk.get({ id: childRow.parentId })
```

### size/clear

```ts
size: number
clear(): void
```  

These are pretty self-explanatory.

### add/insert

```ts
add(value: TValue): boolean
insert(value: TValue): T | null
```

The difference between these methods is what happens on conflict. `add` does nothing and returns `false`, while `insert` replaces the item and returns it. 

### delete

```ts
delete(key: TKey): TValue | null
delete(comparator: (a: TKey) => number): TValue | null
deleteAt(offset: number): TValue | null
```

These two methods remove an item from the index and return it. The second overload of the first one deletes any item from the specified range. The range is defined by a unary comparator that returns zero for the matched items, negative numbers for the preceding, and positive numbers for the following items. It usually is created from a comparator by filling in *the second* of the two values. To delete all the employees from the first department one could do:

```js
let departmentKey = { depId: 1 }
let comparator = a => depPk.comp(a, departmentKey)
while (empDepFk.delete(comparator)) ;
```

### get

```ts
get(key: TKey): TValue | undefined
get(comparator: (a: TKey) => number): TValue | undefined
getAt(offset: number): TValue | undefined
```

Should be obvious what these two do. Again, the overload that takes a comparator gets any item from a range. Can be used to quickly test if the range is empty.

### findRange

```ts
type Range<TValue> = {  
  start: number, end: number,   
  preStart?: TValue, atStart: TValue,   
  preEnd: TValue, atEnd?: TValue   
}  
type TPart = 'full' | 'start' | 'end' | 'any'  
findRange(comparator: (a: TKey) => number, part: TPart = 'full', start?: number, end?: number): Range<TValue>
findRange(key: TKey, part: TPart = 'any', start?: number, end?: number): Range<TValue>
```

A multipurpose method that returns bounding offsets and elements of a given range. The `start` and `end` optional arguments can be used to clamp the result. Which also means that the comparator will never be called for items outside of these bounds.  The `part` argument can be used to specify that only a partial range is needed, that is, the returning `start` or/and `end` offsets don't lie at the exact edges of the range, but are somewhere inside of it. Also, the outlying elements of such offsets are unavailable. So for the `start` and `any` options there is no `atEnd`, and for `end` and `any` there is no `preStart`. If a full range is not empty then the partial range is guaranteed to be non-empty as well. Partial ranges are useful when only the first or last item of the range is needed, or to find the offset of an item, like so:

```js
let r = depPk.findRange({ depId: 2 }) // part defaults to `any` for an object
if (r.start == r.end) {
    // the range is empty, so the item is not found 
    // r.start points to where it would have been
} else {    // r.start + 1 === r.end
    let offset = r.start
    let item = r.atStart // === r.preEnd
}
```

For any range `r` retrieved from `index` the following is true:

```js
 index.getAt(r.start - 1) === r.preStart // when available
 index.getAt(r.start) === r.atStart
 index.getAt(r.end - 1) === r.preEnd
 index.getAt(r.end) === r.atEnd // when available
```

`findRange` can be used to delete all the items from a range:

```js
let { start, end } = index.findRange(comparator)
while (start < end--) index.deleteAt(start)
```

### enumerate

```ts
type Order = 'asc' | 'desc'
enumerate(start: number, end: number, order?: Order): Sequence<TValue>
enumerate(start: number, order?: Order): Sequence<TValue>
enumerate(order?: Order): Sequence<TValue>
enumerate(comparator: (a: TKey) => number, order?: Order): Sequence<TValue>
```

The default order of enumeration is `asc`. For overloads that use range bounds, the interval for enumeration ranges from `start` *including* to `end` *excluding*. So, for a given comparator and order these two approaches are functionally the same:

```js
let { start, end } = index.findRange(comparator)
let seq = index.enumerate(start, end, order)
// vs
let seq = index.enumerate(comparator, order)
```

If the index is modified during enumeration, it generally shouldn't continue, or it may throw an error or produce invalid results. However, in-place replacement of the last yielded item is completely safe:

```js
// should be used with care
depPk.enumerate().forEach(({ depPk }) => 
    depPk.insert({ depPk, name: 'department #' + depPk }))
```

## Sequence

An instance of this class is returned when enumerating an index, it has methods to build linq-like queries for some common operations, like joins (inner and outer) and sorts, but using its functionality is strictly optional. In the end a sequence is just an iterable so any similar library can be used to work with the data. The sequences returned by the  build-in methods behave like one would expect typical linq-like sequences to behave. They are lazy, streaming and try not to buffer data when possible. There are two kinds of methods of this class, some methods create a new sequence from the current, and others execute (or consume) it.

### nextValue

```ts
nextValue(): T | undefined
```

This method returns the next value if it is available, or `undefined` otherwise. It is essentially the same as `next().value`. Used internally by chained `sequence` instances. 

### consumers

```ts
toArray(): T[]
forEach(callback: (value: T, i: number) => void): void
reduce<U>(operation: (accum: U, value: T, i: number) => U, initial: U): U
reduce(operation: (accum: T, value: T, i: number) => T): T
```

These three methods consume the underlying sequence and produce some sort of a result. The `reduce` method of the standard array class throws an error when the array is empty and no `initialValue` is provided. The library method returns `undefined` instead.

### map/filter/concat

```ts
map<U>(transform: (value: T, i: number) => U): Sequence<U>
filter(predicate: (value: T, i: number) => boolean): Sequence<T>
concat<U>(value: U): Sequence<U extends Iterable<infer V> ? T | V : T | U>
```

These should be familiar from their array counterparts.

### flatten

```ts
flatten(): Sequence<T extends Iterable<infer U> ? U : T>
```

Flattens the sequence one level deep. Is used for joins. Both `concat` and `flatten` treat strings as *non*-iterables.

### skip/take

```ts
skip(count: number): Sequence<T>
take(count: number): Sequence<T>
```

Should be obvious what these do. `take` is the only build-in method that may leave the underlying sequence not completely iterated over.

### fallback

```ts
fallback<U>(value: U) : Sequence<T> | Sequence<U>
```

Returns a singleton sequence with the provided value if the sequence is empty. Is used for outer joins.

### sort/reverse

```ts
sort(comparator: (a: T, b: T) => number): Sequence<T>
reverse(): Sequence<T>
```

These two buffer the underlying sequence, so they shouldn't be used for large sequences.

### segment/group

```ts
segment(comparator: (a: T, b: T) => number): Sequence<Sequence<T>>
group(comparator: (a: T, b: T) => number): Sequence<Sequence<T>>
```

The `segment` method segments the underlying sequence into subsequences by the provided comparator, so that for any two items in a subsequence the comparator returns zero. `segment` is a "lightweight" version of `group` that should be used when the sequence is already sorted according to the same comparator. `group` is literally just a shortcut for `sort(comparator).segment(comparator)`. If a subsequence is consumed before the next one is requested, then no buffering occurs. If only the first or the last item is needed `reduce` can be used to efficiently consume subsequences:

```js
  // both consume the entire subsequence and...
  .reduce((a, v) => a)  // returns the first item
  .reduce((a, v) => v)  // returns the last item
  // the method is safe to use without initialValue 
  // as subsequences are guaranteed to be non-empty
```

### into

```ts
into<U>(callback: (seq: Sequence<T>) => U) : U
```

Calls the provided fallback with the current sequence as the first argument and returns the result. `IntrusiveIndex` has the same method that does the same thing. Can be used to provide custom logic or to switch over to another query library altogether.

```js
index.enumerate()
  .into(lodash) // or linq, or whatever
  .... 
```

### from

```ts
static from<T>(iterable: Iterable<T>): Sequence<T>  
```

Wraps an iterable into a `Sequence` object.

```js
Sequence.from([[1, 2], 3]).flatten().toArray() // [1, 2, 3]
``` 

## TransactionBase 

Since modifications are done not on tables as wholes, but on individual indexes, any operation, unless it is performed on a single table that has only one index, involves making multiple modifications. And to maintain database consistency these modifications have to be performed atomically. This is where this small helper class steps in. 

### operations

```ts
add<T>(index: IntrusiveIndex<T, any>, value: T): boolean
insert<T>(index: IntrusiveIndex<T, any>, value: T): T | null
delete<T extends U, U>(index: IntrusiveIndex<T, U>, comparator: (a: U) => number): T | null
delete<T extends U, U>(index: IntrusiveIndex<T, U>, key: U): T | null
deleteAt<T>(index: IntrusiveIndex<T, any>, offset: number): T | null
```

These are the wrappers of the corresponding `IntrusiveIndex` methods that log what rows where added/removed from what indexes, so if a rollback is requested, the journal is used to revert all (or some in case of nested transactions) the changes. For this to work the rows have to be *immutable* (at least with respect to the indexes they are added to), so updating a row means replacing it (an `insert` optionally followed by a `delete`). This might not be the most efficient way of doing updates but making rows immutable makes a whole lot of things easier to reason about.

### rollback

```ts
savepoint(): void
release(): void
rollback(): boolean
```

Savepoint and release can be used to create nested transactions, which will, in case of an error, rollback to the nearest unreleased savepoint:

```js
function tryThis(tr) {
  tr.savepoint()
  try {
    // ....
    tr.release()
  } catch (err) {
    if (!tr.rollback()) die(err)
  }
}
```

If the `rollback` method can't complete it returns false. In this case the database should be considered to be in an invalid state and the app should simply shutdown.

### journal

```ts
journal: {
  savepoints: number[]
  indexes: IntrusiveIndex<any>[]
  removals: any[]
  inserts: any[]
}
```

The `journal` property of a transaction holds several arrays with the transaction data. If the transaction is "committed" the journal can be used to verify the database consistency (to some extent, at least) and to persist changes.

```js
let tr = new Transaction() // derived from TransactionBase
try {
  // ....
  tr.commit() // user implemented method
} catch (err) {
  if (!tr.rollback()) die(err)
}

// ...somewhere in the commit method
for (let i = 0; i < this.indexes.length; i++) {
  let index = this.indexes[i]
  if (/* index is not a primary key */) continue
  let added = this.inserts[i]
  let removed = this.removals[i]
  // proceeding to save the changes
}
```

## constructorFactory

The default export of the library. Creates variants of `IndexContructor`. The reasons to use it may be if more than six indexes per table is required, or to create separate groups of constructors for each table to make verification more robust.

## createFactory

This method should have been named `constructorFactoryFactory`. IIA, IIB ... IIF or any other manually created index constructors are created from the same source code, so working with different row types causes function calls to become megamorphic. It may be perfectly acceptable as the performance is typically cache dominated, but it can be avoided if really necessary. This method probably shouldn't be abused...
