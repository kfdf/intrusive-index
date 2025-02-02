// @ts-check
import { Sequence, IIA, IIB, IIC } from './index.js'

function Department(parentId, name) {
  this.depId = parentId
  this.name = name
}
function Employee(childId, parentId, name, salary, manager = null) {
  this.empId = childId
  this.depId = parentId
  this.name = name
  this.salary = salary
  this.manager = manager
}
/** 
@template K
@typedef {import('./index.js').IntrusiveIndex<Department, Pick<Department, K>>} DepartmentIndex<T> */
/** 
@template K
@typedef {import('./index.js').IntrusiveIndex<Employee, Pick<Employee, K>>} EmployeeIndex<T> */


/** @type {DepartmentIndex<'depId'>} */
let depPk = new IIA((a, b) => a.depId - b.depId)
depPk.add(new Department(1, 'dep #1'))
depPk.add(new Department(3, 'dep #3'))
depPk.add(new Department(4, 'dep #4'))
depPk.add(new Department(2, 'dep #2'))

/** @type {EmployeeIndex<'empId'>} */
let empPk = new IIA((a, b) => a.empId - b.empId)
empPk.add(new Employee(5, 3, 'emp #5 of dep #3 reports to #4', 150, 4))
empPk.add(new Employee(1, 3, 'emp #1 of dep #3', 400))
empPk.add(new Employee(6, 3, 'emp #6 of dep #3 reports to #1', 200, 1))
empPk.add(new Employee(7, 2, 'emp #7 of dep #2 reports to #8', 250, 8))
empPk.add(new Employee(9, 3, 'emp #9 of dep #3 reports to #5', 100, 5))
empPk.add(new Employee(8, 2, 'emp #8 of dep #2', 300))
empPk.add(new Employee(3, 1, 'emp #3 of dep #1', 200))
empPk.add(new Employee(2, 1, 'emp #2 of dep #1 reports to #3', 150, 3))
empPk.add(new Employee(6, 3, 'emp #6 of dep #3 reports to #1', 200, 1))
empPk.add(new Employee(4, 3, 'emp #4 of dep #3 reports to #1', 250, 1))

/** @type {EmployeeIndex<'depId' | 'empId'>} */
let empDepFk = new IIB((a, b) =>
  depPk.comp(a, b) ||
  empPk.comp(a, b))
/** @type {EmployeeIndex<'manager' | 'empId'>} */
let empManagerIx = new IIC((a, b) =>
  a.manager - b.manager ||
  empPk.comp(a, b))

for (let emp of empPk.enumerate()) {
  empDepFk.add(emp)
  empManagerIx.add(emp)
}

depPk
  .enumerate()
  .map(dep => empDepFk
    .enumerate(a => depPk.comp(a, dep))
    .fallback(/** @type{Employee}*/(null))
    .map(emp => ({ emp, dep })))
  .flatten()
  .map(a => a.dep.name + ': ' + (a.emp ? a.emp.name : '--'))
  .forEach(row => console.log(row))

let largestSalaries = depPk
  .enumerate()
  .map(dep => ({ dep, emp: empDepFk
    .enumerate(a => depPk.comp(a, dep))
    .reduce((max, emp) => emp.salary > max.salary ? emp : max)
  }))
  .map(a => a.dep.name + ': ' + (a.emp ? a.emp.name + ' ' + a.emp.salary : ' no employees'))
  .toArray()
console.log(largestSalaries)

function getEmplsTree(manager) {
  return {
    empId: manager.empId,
    salary: manager.salary,
    employees: empManagerIx
      .enumerate(a => a.manager - manager.empId)
      .map(getEmplsTree)
      .toArray()
  }
}
console.log(JSON.stringify(getEmplsTree(empPk.getAt(0)), null, 2))

/**
@param {Employee} manager
@returns {Sequence<Employee>} */
function getEmplsFlat(manager) {
  return empManagerIx
    .enumerate(e => e.manager - manager.empId)
    .map(getEmplsFlat)
    .flatten()
    .into(seq => Sequence.from([manager, seq]).flatten())
}
getEmplsFlat(empPk.getAt(0))
  .map(emp => emp.name)
  .into(a => console.log(a.toArray()))
/**
@param {Employee} manager
@returns {Employee[]} */
function getEmplsImper(manager) {
  let ret = []
  function addEmployee(empl) {
    ret.push(empl)
    empManagerIx
      .enumerate(e => e.manager - empl.empId)
      .forEach(addEmployee)
  }
  addEmployee(manager)
  return ret
}
console.log(getEmplsImper(empPk.getAt(0)).map(e => e.name))

function by(selector) {
  return (a, b) => {
    let av = selector(a)
    let bv = selector(b)
    return av > bv ? 1 : av < bv ? -1 : 0
  }
}
let salaries = empPk
  .enumerate()
  .group(by(a => a.salary / 100 | 0))
  .map(g => {
    let h = g.nextValue().salary / 100 | 0
    let length = g.reduce((a, e) => a + 1, 1)
    return { h, length }
  })
  // .sort(by(a => a.h)) already sorted by the group call above
  .map(a => `${a.h}XX: ${a.length} employees`)
  .toArray()
console.log(salaries)

