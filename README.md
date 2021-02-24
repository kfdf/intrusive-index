# Intrusive Index

A data structure is intrusive if the information required to store the data is embedded inside the data itself. This allows a single data item to be stored in multiple data structures simultaneously without the overhead of additional allocations.

## Why

To get some practice with web technologies, javascript, data structures, and I wanted a *simple* way to work with in-memory tabular data that allows efficient sql/linq-like querying, pagination and modification. The intention behind this library is to add indexes to in-memory tables with minimal overhead. 

## Installation
```
npm install intrusive-index
```

## Example Usage

```js
import { IndexIterator, IIA, IIB, IIC } from 'intrusive-index'

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
  return rator => IndexIterator.from([value, rator]).flatten()
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

The API is small, low level and somewhat footguny, so the `example` folder in the repository contains an express webapp - a toy touhou wiki. Initally I thought to implement the local libray example from MDN, but then I just happened on some data that I believe was scraped from Touhou Fandom Wiki somewhere around 2013 and put into an SQL Server. The data is small, just a few hundred rows accross all tables, but the example is written as if there were hundreds of thousands, or even millions of rows (the reasonable maximum for this sort of storage). So the features are:
- Pagination everywhere
- No client-side scripting or even html validation, for illustrative purposes
- No sessions
- Everything is editable, but with the above limitations it can be awkward
- All changes are persisted in csv files

## Design Considerations

Primary keys should have table names in them, and the names of foreign keys and primary keys they reference should match. This makes a whole lot of things a lot smoother. Things then just fit together really nicely.

Rows should be immutable, this makes them much easier to reason about. Most importanly it allows easy tracking and reversal of changes in the database in case of a failed transaction.

Typescript is a must, at least in the jsdoc form. Since everything is done manually and in the same way, there are myriads of possiblities to mix things up by accident. Typescript does a great job catching these sorts of errors. 

The example has a number of inefficiencies. The first one, and the one that really needs to be addressed with some additional boilerplate, is there are hidden allocations that happen when items are added to the indexes. Secondly, having comparators nested inside other comparators is not ideal, but it nicely illustrates the relationships between various indexes. Finally, IIA, IIB, IIC or manually created index constructors are created from the same source code, so working with different row types causes function calls to become megamorphic. It may be perfectly acceptable as the performance is usually cache dominated, but it can be avoided if really nessesary.

## Library Classes

The library exposes three classes and two methods.
The primary class is `IntrusiveIndex`, the two helper classes are `IndexIterator` and `TransactionBase`, they can assist with data querying and modification. The two methods, that are probably are never needed, are `constructorFactory` which is the default export and `createFactory`. The library doesn't explicitly throw any errors. All methods and function are synchronous.

## IntrusiveIndex

IntrusiveIndex class is not exported directly, but variants of it can be created by `constructorFactory`, also six prefabricated constructors are provided for convenience. The index uses the modified AVL tree that additionally tracks items offsets. The class is generic. The generic parameters are `TValue` and `TKey`, so for the `empManagerIx` index the `TValue` type argument is `{ empId: number, depId: number, name: string, managerId: number }` and `TKey` is `{ managerId: number, empId: number }`. Actually, the type of the `managerId` field should be `number | null` but javascript coersion works well in this case converting nulls to zeroes and typescript can be overly pedantic.

-------------
```js
static l: Symbol
static r: Symbol
static d: Symbol
```

The index "injects" three fields into each item that is stored in it (so it adds 24 bytes per item, or 12 with pointer compression). The keys of the fields are exposed as static properties, the inteded use is to "pre-initialize" items that will be added to the index to avoid additional internal allocations. So the example above is inefficient, the more proper way of creating rows is to add this boilerplate
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

----------
```js
constructor(comparator: (a: TKey, b: TKey) => number)
readonly comp: (a: TKey, b: TKey) => number
```

A comparator that is provided to define item ordering is also availabe as the `comp` property of the index.

-----------
```js
readonly size: number
clear(): void
```  

These are pretty self-explanatory.

---------
```js
add(value: TValue): boolean
insert(value: TValue): T | null
```

The difference between these methods is what happens on conflict. `Add` does nothing and returns `false`, while `insert` replaces the item and returns it. 

----------
```js
delete(key: TKey): TValue | null
delete(range: (a: TKey) => number): TValue | null
deleteAt(offset: number): TValue | null
```

These three methods remove an item from the index and return it. The second of these deletes any item from the specifiend range. The range is defined by a tri-state predicate that returns zero for the matched items, negative numbers for the preceding, and positive numbers for the following items. It usually is created from a comparator by filling in *the second* of the two values, so it is more like unary comparator. To delete all the employees from the first department one could do:

```js
let departmentKey = { depId: 1 }
let range = a => depPk.comp(a, departmentKey)
while (empDepFk.delete(range)) ;
```
--------
```
get(key: TKey): TValue | undefined
get(range: (a: TKey) => number): TValue | undefined
getAt(offset: number): TValue | undefined
```
Should be obvious what these three do. Again, the second one gets any item from a range. Can be used to quickly test if a range is empty. For example, to verify that the parent that is about to be deleted has no children.

---------------
```js
type Range<TValue> = {  
  start: number, end: number,   
  preStart?: TValue, atStart: TValue,   
  preEnd: TValue, atEnd?: TValue   
}  
type TOption = 'full' | 'start' | 'end' | 'any'  
findRange(range: (a: TKey) => number, option: TOption = 'full'): Range<TValue>
findRange(key: TKey, option: TOption = 'any'): Range<TValue>
```

For any range `r` retrieved from `index` the following is true:
```js
 index.getAt(r.start - 1) === r.preStart // when available
 index.getAt(r.start) === r.atStart
 index.getAt(r.end - 1) === r.preEnd
 index.getAt(r.end) === r.atEnd // when available
```
## IndexIterator

IndexIterator is returned when enumerating an index, it has methods to build linq-like queries for some common operations, like joins (inner and outer) and sorts, but using its functionality is strictly optional. In the end IndexIterator is just an iterable so any similar library can be used to query the data. The queries returned by the  build-in methods behave like one would expect linq queries to behave. They are lazy, try not to buffer data when possible (`map` and `filter` don't do this, `sort` and `reverse` have no choice but buffer all the data before yielding a single element, and `segment` tries not to), and they are, just like generators, both iterators and iterables, or one-time iterables.

## TransactionBase 

TransactionBase is small helper class. Since modifications are done not on tables as wholes, but on individual indexes, any operation must be a transaction. It must perform all the actions or none at all. This class is an implemention of optimistic transaction. It assumes that rows are immutable. It transparently wraps all the index methods and logs what items where added/removed from what indexes, so if a rollback is requested, the journal is used to revert all (or some in case of nested transactions) the changes. If the transaction is "commited" the journal can be used to verify consistency, and to persist changes.

