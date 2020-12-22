/**
@template T
@typedef {Generator<T> & {
  moveNext: () => boolean;
  current: T | null;
}} IndexGenerator */

/**
@template T
@typedef IntrusiveIndex 
@property {() => void} clear 
@property {number} size
@property {(value: T) => boolean} add
@property {(value: T) => (T | null)} insert 
@property {(value: T) => (T | null)} delete
@property {(pos: number) => (T | null)} deleteAt
@property {(valueOrComparer: (T | (a: T) => number) => (T | null)} get
@property {(pos: number) => (T | null)} getAt
@property {(comparer: (a: T) => number) => { start: number, end: number}} findRange
@property {(comparer: (a: T) => number, reversed?: boolean) => IndexGenerator<T>} enumerate 
@property {(start?: number, end?: number, reversed?: boolean) => IndexGenerator<T>} enumerateRange
*/
/**
@typedef {new <T>(comparer: (a: T, b: T) => number) => IntrusiveIndex<T>} IndexConstructor */

/** 
@returns {IndexConstructor & {
  l: symbol;
  r: symbol;
  d: symbol;
}} */
export default function constructorFactory() {
  const UNCHANGED = 0
  const UPDATED = 1
  const RESIZED = 2
  const UNBALANCED = 3
  const l = Symbol('left')
  const r = Symbol('right')
  const d = Symbol('diff')
 
  function addRight(curr, node, comparer, replace) {
    let right = curr[r]
    if (right == null) {
      curr[r] = node
      detachedNode = null
      return (++curr[d] & 3) == 2 ? RESIZED : UPDATED
    } 
    let cmp = comparer(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comparer, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comparer, replace)
    } else if (replace && right !== node) {
      curr[r] = detachNode(right, node)
    } else {
      detachedNode = null
    }
    if (result < RESIZED) return result
    if (result == UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) == 1) return UPDATED
    }
    if ((curr[d] & 3) == 2) return UNBALANCED
    return (++curr[d] & 3) == 2 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comparer, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      curr[d] += 4
      detachedNode = null
      return (--curr[d] & 3) == 0 ? RESIZED : UPDATED
    }    
    let cmp = comparer(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comparer, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comparer, replace)
    } else if (replace && left !== node) {
      curr[l] = detachNode(left, node)
    } else {
      detachedNode = null
    }
    if (result == UNCHANGED) return UNCHANGED
    curr[d] += 4
    if (result == UPDATED) return UPDATED
    if (result == UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) == 1) return UPDATED
    }
    if ((curr[d] & 3) == 0) return UNBALANCED
    return (--curr[d] & 3) == 0 ? RESIZED : UPDATED
  }  
  let detachedNode = null  
  function detachNode(target, repl) {
    detachedNode = target
    repl[l] = target[l]
    repl[r] = target[r]
    repl[d] = target[d]
    return repl
  }
  function getDetached() {
    let ret = detachedNode
    if (!ret) return ret
    ret[l] = null
    ret[r] = null
    ret[d] = 1
    detachedNode = null
    return ret
  }
  /** 
  @returns {0|1|2|3} */
  function deleteLeft(curr, value, comparer) {
    let left = curr[l]
    if (left == null) {
      detachedNode = null
      return UNCHANGED
    }
    let cmp = comparer(left, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(left, value, comparer)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comparer)
    } else if (left[l] && left[r]) {
      let size = left[d] >>> 2
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    if (result == UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result == UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteLeftAt(curr, index) {
    let left = curr[l]
    let size = left[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(left, index)
    } else if (size < index) {
      result = deleteRightAt(left, index - size - 1)
    } else if (left[l] && left[r]) {
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    curr[d] -= 4
    if (result == UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /**
  @param {2|3} result */
  function deleteLeftFix(curr, result) {
    if (result == UNBALANCED) {
      let left = rotate(curr[l]) 
      curr[l] = left
      if ((left[d] & 3) != 1) return UPDATED
    }
    if ((curr[d] & 3) == 2) return UNBALANCED
    return (++curr[d] & 3) == 2 ? UPDATED : RESIZED
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, index) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(right, index)
    } else if (size < index) {
      result = deleteRightAt(right, index - size - 1)
    } else if (right[l] && right[r]) {
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result == UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, index) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(right, index)
    } else if (size < index) {
      result = deleteRightAt(right, index - size - 1)
    } else if (right[l] && right[r]) {
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result == UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comparer) {
    let right = curr[r]
    if (right == null) {
      detachedNode = null
      return UNCHANGED  
    }
    let cmp = comparer(right, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(right, value, comparer)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comparer)
    } else if (right[l] && right[r]) {
      let size = right[d] >>> 2
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result == UNCHANGED) return UNCHANGED
    if (result == UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @param {2|3} result */
  function deleteRightFix(curr, result) {
    if (result == UNBALANCED) {
      let right = rotate(curr[r])
      curr[r] = right
      if ((right[d] & 3) != 1) return UPDATED
    }
    if ((curr[d] & 3) == 0) return UNBALANCED
    return (--curr[d] & 3) == 0 ? UPDATED : RESIZED
  }  

  function rotate(node) {
    if ((node[d] & 3) == 2) {
  //    2+                    0       
  // |x|    1             2    |x|    
  //     |x| |x|       |x| |x| |1|    
  //     |1| |1|           |1|        
  // ---------------------------------
  //    2+                    1       
  // |x|    2             1    |x|    
  //     |x| |x|       |x| |x| |1|    
  //         |1|                      
      let right = node[r]
      let diff = right[d] & 3
      let nodeSize = node[d] & ~3
      if (diff >= 1) {
        if (diff == 2) {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 1
        } else {
          node[d] = nodeSize | 2
          right[d] = right[d] & ~3
        }
        node[r] = right[l]
        right[l] = node
        right[d] += nodeSize + 4
        return right
      } else {
  //    2+                    1       
  // |x|        0         ?       ?   
  //        ?    |x|   |x| |x? |x? |x|
  //     |x? |x?                      
        let left = right[l]
        let diff = left[d] & 3
        if (diff == 2) {
          node[d] = nodeSize
          right[d] = right[d] & ~3 | 1
        } else if (diff == 0) {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 2
        } else {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 1
        }
        left[d] = left[d] & ~3 | 1
        node[r] = left[l]
        right[l] = left[r]
        left[l] = node
        left[r] = right
        right[d] -= (left[d] & ~3) + 4
        left[d] += nodeSize + 4
        return left
      }
    } else {
  //        0-             2           
  //    1    |x|       |x|    0       
  // |x| |x|           |1| |x| |x|    
  // |1| |1|               |1|        
  // ---------------------------------
  //        0-             1           
  //   0     |x|       |x|    1       
  // |x| |x|           |1| |x| |x|    
  // |1|                              
      let left = node[l]
      let leftSize = left[d] & ~3
      let diff = left[d] & 3
      if (diff <= 1) {
        if (diff == 0) {
          left[d] = leftSize | 1
          node[d] = node[d] & ~3 | 1
        } else {
          left[d] = leftSize | 2
          node[d] = node[d] & ~3
        }
        node[l] = left[r]
        left[r] = node
        node[d] -= leftSize + 4
        return left
      } else {
  //               0-            1       
  //       2        |x|      ?       ?   
  //    |x|    ?          |x| |x? |x? |x|
  //        |x? |x?                      
        let right = left[r]
        let diff = right[d] & 3
        if (diff == 2) {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize
        } else if (diff == 0) {
          node[d] = node[d] & ~3 | 2
          left[d] = leftSize | 1
        } else {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize | 1
        }
        right[d] = right[d] & ~3 | 1
        left[r] = right[l]
        node[l] = right[r]
        right[l] = left
        right[r] = node
        right[d] += leftSize + 4
        node[d] -= (right[d] & ~3) + 4
        return right
      }
    }
  }
  function getAt(node, index) {
    while (true) {
      let size = node[d] >>> 2
      if (index < size) {
        node = node[l]
      } else if (index > size) {
        index -= size + 1
        node = node[r]
      } else {
        return node
      }
    }
  }  
  function enumerateRange(node, start, end, reversed) {
    let count = end - start
    if (count === 1) {
      return new MiniIndexGenerator(node, null)
    }
    if (count === 2) {
      let ascending = start === node[d] >>> 2
      let node2 = getAt(node, start + +ascending)
      if (ascending === reversed) {
        return new MiniIndexGenerator(node2, node)
      } else {
        return new MiniIndexGenerator(node, node2)
      }
    }
    let nodes = []
    if (reversed) start = end - 1
    while (true) {
      let index = node[d] >>> 2
      if (start < index) {
        if (!reversed) nodes.push(node)
        node = node[l]
      } else if (start > index) {
        start -= index + 1
        if (reversed) nodes.push(node)
        node = node[r]
      } else {
        nodes.push(node)
        return new IndexGenerator(nodes, count, reversed)
      }
    }
  }
  class IndexGenerator {
    constructor(nodes, count, reversed) {
      this.current = null
      this.nodes = nodes
      this.count = count
      this.reversed = reversed
    }
    moveNext() {
      if (--this.count < 0) {
        this.current = null
        return false
      } 
      let { nodes, current, reversed } = this
      if (current) {
        if (reversed) {
          current = current[l]
          while (current) {
            nodes.push(current)
            current = current[r]
          }
        } else {
          current = current[r]
          while (current) {
            // if (node[d] >>> 2 < this.count)
            nodes.push(current)
            current = current[l]
          }
        }
      }
      this.current = nodes.pop()
      return true
    }  
    next() {
      let done = !this.moveNext()
      let value = this.current
      return { done, value }
    }
    [Symbol.iterator]() {
      return this
    }
  }
  class MiniIndexGenerator {
    constructor(item, item2) {
      this.current = null
      this.item = item
      this.item2 = item2
    }
    moveNext() {
      let top = this.item
      this.current = top
      this.item = this.item2
      this.item2 = null
      return !!top
    }   
    next() {
      let done = !this.moveNext()
      let value = this.current
      return { done, value }
    } 
    [Symbol.iterator]() {
      return this
    }
  }  
  return class IntrusiveIndex {
    constructor(comparer) {
      this.comparer = comparer
      this.root = { [l]: null, [r]: null, [d]: 1 }
    }
    get size() {
      return this.root[d] >>> 2
    }
    clear() {
      let { root } = this
      root[l] = null
      root[r] = null
      root[d] = 1
    }
    add(value) {
      let { root, comparer } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      return !!addLeft(root, value, comparer, false)
    }
    insert(value) {
      let { root, comparer } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      addLeft(root, value, comparer, true)
      return getDetached()
    }
    delete(value) {
      let { root, comparer } = this
      deleteLeft(root, value, comparer)
      return getDetached()
    }
    deleteAt(index) {
      let { root, size } = this
      if (index < 0 || index >= size) return null
      deleteLeftAt(root, index)
      return getDetached()
    }
    get(value) {
      let { root, comparer } = this
      let isComp = typeof value === 'function'
      let node = root[l]
      while (node) {
        let cmp = isComp ? value(node) : comparer(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else return node
      }
      return null
    }  
    getAt(index) {
      let { root, size } = this
      if (index < 0) index = size + index + 1
      if (index < size) return getAt(root[l], index)
      return null
    }
    findRange(comparer) {
      let { root } = this
      let node = root[l]
      let end = 0
      let start = -1
      while (node) {
        let cmp = comparer(node)
        if (cmp > 0) {
          node = node[l]
          continue
        } 
        if (start == -1 && cmp == 0) {
          start = end + (node[d] >>> 2)
          let offset = end
          let node2 = node[l]
          while (node2) {
            if (comparer(node2) < 0) {
              offset += (node2[d] >>> 2) + 1
              node2 = node2[r]
            } else {
              start = offset + (node2[d] >>> 2)
              node2 = node2[l]
            }
          }
        }
        end += (node[d] >>> 2) + 1
        node = node[r]
      }
      if (start == -1) start = end
      return { start, end }
    } 
    enumerate(comparer, reversed = false) {
      let { root } = this
      let curr = root[l]
      while (curr) {
        let cmp = comparer(curr)
        if (cmp < 0) curr = curr[r]
        else if (cmp > 0) curr = curr[l]
        else break
      }
      if (!curr) return new MiniIndexGenerator(null, null)
      let start = curr[d] >>> 2
      let end = start + 1
      let offset = 0
      let node = curr[l]
      while (node) {
        if (comparer(node) >= 0) {
          start = offset + (node[d] >>> 2)
          node = node[l]
        } else {
          offset += (node[d] >>> 2) + 1
          node = node[r]
        }
      }
      node = curr[r]
      while (node) {
        if (comparer(node) > 0) {
          node = node[l]
        } else {
          end += (node[d] >>> 2) + 1
          node = node[r]
        }
      }    
      return enumerateRange(curr, start, end, reversed)
    }
    enumerateRange(start = 0, end = ~0, reversed = false) {
      let { size, root } = this
      if (end < 0) end = size + end + 1
      start = Math.max(0, start)
      end = Math.min(size, end)
      if (start >= end) {
        return new MiniIndexGenerator(null, null)
      } 
      let node = root[l]
      while (true) {
        let index = node[d] >>> 2
        if (end <= index) {
          node = node[l]
        } else if (index < start) {
          node = node[r]
          start -= index + 1
          end -= index + 1
        } else {
          return enumerateRange(node, start, end, reversed)
        }
      }
    }
    static get l() {
      return l
    }
    static get r() {
      return r
    }
    static get d() {
      return d
    }
  }
}

export const IIA = constructorFactory()
export const IIB = constructorFactory()
export const IIC = constructorFactory()
export const IID = constructorFactory()
export const IIE = constructorFactory()
export const IIF = constructorFactory()


export class Transaction {
  constructor() {
    this.indexList = []
    this.removedList = []
    this.insertedList = []
  }
  /** 
  @template T
  @param {IntrusiveIndex<T>} index
  @param {T} item */
  add(index, item) {
    if (!index.add(item)) return false
    this.indexList.push(index)
    this.removedList.push(null)
    this.insertedList.push(item)
    return true
  }  
  /** 
  @template T
  @param {IntrusiveIndex<T>} index
  @param {T} item */  
  insert(index, item) {
    let removed = index.insert(item)
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(item)
    return removed
  }
  /** 
  @template T
  @param {IntrusiveIndex<T>} index
  @param {T} item */  
  delete(index, item) {
    let removed = index.delete(item)
    if (!removed) return null
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(null)
    return removed
  }
  /** 
  @template T
  @param {IntrusiveIndex<T>} index
  @param {number} pos */  
  deleteAt(index, pos) {
    let removed = index.deleteAt(pos)
    if (!removed) return null
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(null)
    return removed
  }  
  rollback() {
    let { indexList, removedList, insertedList } = this
    while (indexList.length) {
      let index = indexList.pop()
      let removed = removedList.pop()
      let inserted = insertedList.pop()
      let current
      if (inserted && removed) {
        current = index.insert(removed)
      } else if (inserted) {
        current = index.delete(inserted)
      } else if (removed) {
        current = index.insert(removed)
      }
      if (current !== inserted) throw {
        message: 'rollback failed',
        current, 
        expected: inserted,
        position: indexList.length,
      }
    }
  }
}
/**
@template T
@param {Transaction} tr
@param {IntrusiveIndex<T>} index
@param {T} newValue
@param {T} oldValue */
export function replace(tr, index, newValue, oldValue) {
  let removed = tr.insert(index, newValue)
  removed = removed || oldValue && tr.delete(oldValue)
  return removed !== oldValue
}
/**
@param {IntrusiveIndex<any>} index */
export function validateIndex(index) {
  let { root, comparer } = index
  let { l, r, d } = index.constructor
  validateNode(root, true)
  function validateNode(node, isRoot) {
    if (node == null) return {
      min: null, max: null,
      height: 0, size: 0
    }    
    if (typeof node[l] != 'object') throw {
      message: `the 'left' property is not an object`,
      current: node,
    }
    if (typeof node[r] != 'object') throw {
      message: `the 'right' property is not an object`,
      current: node,
    }
    if (!Number.isSafeInteger(node[d])) throw {
      message: `the 'diff' property is not an integer`,
      current: node,
    }
  
    let lst = validateNode(node[l])
    let rst = validateNode(node[r])
  
    if (lst.max && comparer(lst.max, node) >= 0) throw {
      message: 'the left subtree is ranked higher or equal',
      current: node,
      highestRankingLeft: lst.max
    }
    if (rst.min && comparer(rst.min, node) <= 0) throw {
      message: 'the right subtree is ranked lower or equal',
      current: node, 
      lowestRankingRight: rst.min
    }
    let diff = (node[d] & 3) - 1
    if (!isRoot && rst.height - lst.height !== diff) throw {
      message: 'invalid height difference',
      current: node,
      currentDiff: diff, 
      rightHeight: rst.height,
      leftHeight: lst.height,
    }
    let size = node[d] >>> 2
    if (lst.size !== size) throw {
      message: 'invalid size',
      current: node,
      currentSize: size,
      actualSize: lst.size,
    }
    return {
      min: lst.min || node, 
      max: rst.max || node, 
      height: Math.max(lst.height, rst.height) + 1, 
      size: lst.size + rst.size + 1,
    }
  }  
}
/** 
@param {Transaction} transaction
@param {IntrusiveIndex<any>[][]} tables */
export function validateTransaction(transaction, tables) {
  let tableIndex = new Map()
  let tableEntries = []
  for (let table of tables) {
    let tableEntry = { table, rows: new Set() }      
    tableEntries.push(tableEntry)
    for (let index of table) {
      tableIndex.set(index, tableEntry)
    }
  }
  let { indexList, removedList, insertedList } = transaction 
  for (let i = 0; i < indexList.length; i++) {
    let entry = tableIndex.get(indexList[i])
    if (!entry) continue
    let removed = removedList[i]
    if (removed) entry.rows.add(removed)
    let inserted = insertedList[i]
    if (inserted) entry.rows.add(inserted)
  }
  for (let { table, rows } of tableEntries) {
    for (let row of rows) {
      let first
      for (let index of table) {
        if (first === undefined) {
          first = index.get(row)
        } else {
          if (index.get(row) !== first) throw {
            message: 'validation failed',
            current: row, 
            expected: first,
          }
        }
      }
    }
  }
}
