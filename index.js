export default function constructorFactory() {
  const UNCHANGED = 0
  const UPDATED = 1
  const RESIZED = 2
  const UNBALANCED = 3
  const l = Symbol('left')
  const r = Symbol('right')
  const d = Symbol('diff')
  function addRight(curr, node, comp, replace) {
    let right = curr[r]
    if (right == null) {
      curr[r] = node
      return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
    } 
    let cmp = comp(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comp, replace)
    } else if (cmp === 0 && replace && right !== node) {
      curr[r] = detachNode(right, node)
    }
    if (result < RESIZED) return result
    if (result === UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) === 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return UNBALANCED
    curr[d] = diff + 1
    return (diff & 3) === 1 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comp, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      return ((curr[d] += 3) & 3) === 0 ? RESIZED : UPDATED
    }    
    let cmp = comp(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comp, replace)
    } else if (cmp === 0 && replace && left !== node) {
      curr[l] = detachNode(left, node)
    }
    if (result === UNCHANGED) return UNCHANGED
    let diff = curr[d]
    curr[d] = (diff += 4)
    if (result === UPDATED) return UPDATED
    if (result === UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) === 1) return UPDATED
    }
    if ((diff & 3) === 0) return UNBALANCED
    curr[d] = diff - 1
    return (diff & 3) === 1 ? RESIZED : UPDATED
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
  function deleteLeft(curr, value, comp) {
    let left = curr[l]
    if (left == null) return UNCHANGED
    let cmp = value === undefined ? comp(left) : comp(left, value)
    /** @type {0|1|2|3} */
    let result = UNCHANGED
    if (cmp > 0) {
      result = deleteLeft(left, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comp)
    } else if (cmp === 0) {
      let ll = left[l]
      let lr = left[r]
      if (ll && lr) {
        let size = left[d] >>> 2
        result = deleteLeftAt(left, size - 1)
        curr[l] = left = detachNode(left, detachedNode)
      } else {
        detachedNode = left
        curr[l] = left = ll || lr
        result = RESIZED
      }
    } 
    if (result === UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteLeftAt(curr, pos) {
    let left = curr[l]
    let size = left[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > pos) {
      result = deleteLeftAt(left, pos)
    } else if (size < pos) {
      result = deleteRightAt(left, pos - size - 1)
    } else if (left[l] && left[r]) {
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /**
  @param {2|3} result */
  function deleteLeftFix(curr, result) {
    if (result === UNBALANCED) {
      let left = rotate(curr[l]) 
      curr[l] = left
      if ((left[d] & 3) != 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return UNBALANCED
    curr[d] = diff + 1
    return (diff & 3) === 1 ? UPDATED : RESIZED
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, pos) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > pos) {
      result = deleteLeftAt(right, pos)
    } else if (size < pos) {
      result = deleteRightAt(right, pos - size - 1)
    } else if (right[l] && right[r]) {
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result === UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comp) {
    let right = curr[r]
    if (right == null) return UNCHANGED  
    let cmp = value === undefined ? comp(right) : comp(right, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(right, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comp)
    } else if (cmp === 0) {
      let rl = right[l]
      let rr = right[r]
      if (rl && rr) {
        let size = right[d] >>> 2
        result = deleteLeftAt(right, size - 1)
        curr[r] = right = detachNode(right, detachedNode)
      } else {
        detachedNode = right
        curr[r] = right = rl || rr
        result = RESIZED
      }
    }
    if (result === UNCHANGED) return UNCHANGED
    if (result === UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @param {2|3} result */
  function deleteRightFix(curr, result) {
    if (result === UNBALANCED) {
      let right = rotate(curr[r])
      curr[r] = right
      if ((right[d] & 3) != 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 0) return UNBALANCED
    curr[d] = diff - 1
    return (diff & 3) === 1 ? UPDATED : RESIZED
  }  

  function rotate(node) {
    if ((node[d] & 3) === 2) {
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
        if (diff === 2) {
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
        if (diff === 2) {
          node[d] = nodeSize
          right[d] = right[d] & ~3 | 1
        } else if (diff === 0) {
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
        if (diff === 0) {
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
        if (diff === 2) {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize
        } else if (diff === 0) {
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

  function enumerateRange(root, start, end, reversed) {
    let count = end - start
    if (count <= 0) {
      return new WalkerIterator(null, 0)
    }
    let node = root[l]
    while (true) {
      let pos = node[d] >>> 2
      if (end <= pos) {
        node = node[l]
      } else if (pos < start) {
        node = node[r]
        start -= pos + 1
        end -= pos + 1
      } else break
    }
    if (count === 1) {
      return new WalkerIterator([node], 1)
    }
    let nodes = []
    if (reversed) start = end - 1
    while (true) {
      let pos = node[d] >>> 2
      if (start < pos) {
        if (!reversed) nodes.push(node)
        node = node[l]
      } else if (start > pos) {
        start -= pos + 1
        if (reversed) nodes.push(node)
        node = node[r]
      } else {
        nodes.push(node)
        break
      }
    }    
    return new WalkerIterator(nodes, count, reversed)
  }

  class PredicateIterator extends IndexIterator {
    constructor(root, comp, reversed) {
      super()
      this.root = root
      this.nodes = null
      this.comp = comp
      this.reversed = reversed
    }
    buildStack(node, predicate) {
      let { nodes, reversed, comp } = this
      while (node) {
        let cmp = comp(node)
        if (cmp < 0) {
          node = node[r]
        } else if (cmp > 0) {
          node = node[l]
        } else if (cmp === 0) {
          if (predicate) {
            let cmp = predicate(node)
            if (reversed) cmp = -cmp
            if (cmp < 0) {
              node = node[reversed ? l : r]
              continue
            }
          }
          nodes.push(node)
          node = node[reversed ? r : l]
        } else break
      }
    }
    adjust(predicate) {
      let { current, nodes, reversed } = this
      if (!current && !nodes) {
        this.nodes = nodes = []
        this.buildStack(this.root, predicate)
        return
      }
      this.current = null
      while (nodes.length) {
        let top = nodes.pop()
        let cmp = predicate(top)
        if (reversed) cmp = -cmp
        if (cmp >= 0) {
          nodes.push(top)
          break
        } 
        current = top
      }   
      this.buildStack(current, predicate)
    }
    moveNext() {
      let { nodes, current, comp, reversed } = this
      if (current) {
        current = current[reversed ? l : r]
        while (current) {
          if (nodes.length || comp(current) === 0) {
            nodes.push(current)
          }
          current = current[reversed ? r : l]
        }
      } else if (!nodes) {
        this.nodes = nodes = []
        this.buildStack(this.root)
      }
      this.current = current = nodes.pop()
      return !!current 
    }  
  }
  class WalkerIterator extends IndexIterator {
    constructor(nodes, count, reversed) {
      super()
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
            nodes.push(current)
            current = current[l]
          }
        }
      }
      this.current = nodes.pop()
      return true
    }  
  }
  return class IntrusiveIndex {
    constructor(comp) {
      this.comp = comp
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
      let { root, comp } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      return !!addLeft(root, value, comp, false)
    }
    insert(value) {
      let { root, comp } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      detachedNode = null
      addLeft(root, value, comp, true)
      return getDetached()
    }
    delete(value) {
      let { root, comp } = this
      detachedNode = null
      if (typeof value === 'function') {
        deleteLeft(root, undefined, value)
      } else {
        deleteLeft(root, value, comp)
      }
      return getDetached()
    }
    deleteAt(pos) {
      let { root, size } = this
      // if (pos < 0) pos = size + pos
      if (pos < 0 || pos >= size) return null
      detachedNode = null
      deleteLeftAt(root, pos)
      return getDetached()
    }
    get(value) {
      let { root, comp } = this
      let isComp = typeof value === 'function'
      let node = root[l]
      while (node) {
        let cmp = isComp? value(node) : comp(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else if (cmp === 0) return node
      }
      return null
    }  
    getAt(pos) {
      let { root, size } = this
      // if (pos < 0) pos = size + pos
      if (pos < 0 || pos >= size) return null
      let node = root[l]
      while (true) {
        let size = node[d] >>> 2
        if (pos < size) {
          node = node[l]
        } else if (pos > size) {
          pos -= size + 1
          node = node[r]
        } else {
          return node
        }
      }
    }
    findRange(comp, option) {
      let { root } = this
      let node = root[l]
      let end = 0
      let start = -1
      let beforeStart = null
      let afterStart = null
      let beforeEnd = null
      let afterEnd = null
      while (node) {
        let cmp = comp(node)
        if (cmp > 0) {
          afterEnd = node
          node = node[l]
          continue
        } 
        if (start === -1 && cmp === 0) {
          let nodePos = end + (node[d] >>> 2)
          beforeStart = beforeEnd // !!
          if (option === 'any') {
            return {
              start: nodePos, end: nodePos + 1, 
              beforeStart, afterStart: node, 
              beforeEnd: node, afterEnd
            }
          }
          start = nodePos
          afterStart = node
          if (option !== 'end') {
            let offset = end
            let node2 = node[l]
            while (node2) {
              if (comp(node2) < 0) {
                offset += (node2[d] >>> 2) + 1
                beforeStart = node2
                node2 = node2[r]
              } else {
                start = offset + (node2[d] >>> 2)
                afterStart = node2
                node2 = node2[l]
              }
            }
            if (option === 'start') {
              return {
                start, end: nodePos + 1, 
                beforeStart, afterStart, 
                beforeEnd: node, afterEnd
              }
            }
          }
        }
        end += (node[d] >>> 2) + 1
        beforeEnd = node
        node = node[r]
      }
      if (start === -1) {
        start = end
        beforeStart = beforeEnd
        afterStart = afterEnd
      }
      return {
        start, end, 
        beforeStart, afterStart, 
        beforeEnd, afterEnd 
      }
    } 
    enumerate(a, b, c) {
      let { root } = this
      if (typeof a === 'function') {
        return new PredicateIterator(root[l], a, b === 'desc')
      }
      let size = root[d] >>> 2
      if (typeof a !== 'number') {
        c = a
        b = size
        a = 0
      } else {
        a = a > 0 ? a : 0
        if (typeof b !== 'number') {
          c = b
          b = size
        } else {
          // b = b < 0 ? size + b : b < size ? b : size
          b = b < size ? b : size
        }
      }
      return enumerateRange(root, a, b, c === 'desc')
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

export class IndexIterator {
  constructor() {
    this.current = null
  }
  moveNext() {
    return false
  }
  next() {
    let done = !this.moveNext()
    let value = this.current
    return { done, value }
  }
  [Symbol.iterator]() {
    return this
  }
  map(transform) {
    return new MapIterator(this, transform)
  }
  filter(predicate) {
    return new FilterIterator(this, predicate)
  }
  flatten() {
    return new FlattenIterator(this)
  }
  skipTake(skip, take) {
    return new RangeIterator(this, skip, take)
  }
  fallback(value) {
    return new FallbackIterator(this, value)
  }
  into(func) {
    return func(this)
  }
  reduce(callback, value) {
    if (value === undefined) {
      this.moveNext()
      value = this.current
    }
    while (this.moveNext()) {
      value = callback(value, this.current)
    }
    return value
  }
  forEach(callback) {
    while (this.moveNext()) {
      callback(this.current)
    }
  }
  toArray() {
    let ret = []
    while (this.moveNext()) {
      ret.push(this.current)
    }
    return ret
  }
  static from(iterable) {
    return new WrapperIterator(iterable)
  }
}

class WrapperIterator extends IndexIterator {
  constructor(iterable) {
    super()
    this.iterator = iterable[Symbol.iterator]()
    this.done = false
  }
  moveNext() {
    if (this.done) return false // extra safe
    let { done, value } = this.iterator.next()
    if (done) {
      this.current = null
      this.done = true
      return false
    } else {
      this.current = value
      return true
    }
  }
}

class MapIterator extends IndexIterator {
  constructor(rator, transform) {
    super()
    this.rator = rator
    this.transform = transform
  }
  moveNext() {
    let { rator, transform } = this
    let ret = rator.moveNext()
    this.current = ret ? transform(rator.current) : null
    return ret
  }
}
class FilterIterator extends IndexIterator {
  constructor(rator, predicate) {
    super()
    this.rator = rator
    this.predicate = predicate
  }
  moveNext() {
    let { rator, predicate } = this
    while (rator.moveNext()) {
      let { current } = rator
      if (!predicate(current)) continue
      this.current = current
      return true
    }
    this.current = null
    return false
  }
}
class FlattenIterator extends IndexIterator {
  constructor(rator) {
    super()
    this.rator = rator
    this.inner = null
  }
  moveNext() {
    while (true) {
      let { inner } = this
      if (inner) {
        if (inner.moveNext()) {
          this.current = inner.current
          return true
        } else {
          this.inner = null
        }
      }
      let { rator } = this
      if (rator.moveNext()) {
        let { current } = rator
        if (Symbol.iterator in current) {
          if (current.moveNext) { 
            this.inner = current
          } else {  
            this.inner = new WrapperIterator(current)
          }
        } else {
          this.current = current
          return true
        }
      } else {
        this.current = null
        return false
      }
    }
  }
}
class RangeIterator extends IndexIterator {
  constructor(rator, start, length = -1) {
    super()
    this.rator = rator
    this.start = Math.max(0, start)
    this.length = length
  }  
  moveNext() {
    let { rator } = this
    while (this.start && rator.moveNext()) {
      this.start--
    }
    if (this.length) {
      this.length--
      let ret = rator.moveNext()
      this.current = rator.current
      return ret
    } 
    this.current = null
    return false
  }
}
class FallbackIterator extends IndexIterator {
  constructor(rator, value) {
    super()
    this.rator = rator
    this.value = value
  }
  moveNext() {
    let { rator, value } = this
    if (value === undefined) {
      let ret = rator.moveNext()
      this.current = rator.current
      return ret
    }
    this.value = undefined
    this.current = rator.moveNext() ? rator.current : value
    return true
  }
}

export const IIA = constructorFactory()
export const IIB = constructorFactory()
export const IIC = constructorFactory()
export const IID = constructorFactory()
export const IIE = constructorFactory()
export const IIF = constructorFactory()

export function createFactory() {
  let source = constructorFactory.toString()
  let start = source.indexOf('{') + 1
  let end = source.lastIndexOf('}') 
  let body = source.slice(start, end)
  let factory = new Function(IndexIterator.name, body)
  return () => factory(IndexIterator)  
}

export class Transaction {
  constructor() {
    this.journal = {
      savepoints: [],
      indexes: [],
      removals: [],
      inserts: [],
    }
  }
  add(index, item) {
    if (!index.add(item)) return false
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(null)
    inserts.push(item)
    return true
  }  
  insert(index, item) {
    let removed = index.insert(item)
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(item)    
    return removed
  }
  delete(index, item) {
    let removed = index.delete(item)
    if (!removed) return null
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(null)        
    return removed
  }
  deleteAt(index, pos) {
    let removed = index.deleteAt(pos)
    if (!removed) return null
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(null)      
    return removed
  }
  savepoint() {
    let { indexes, savepoints } = this.journal
    savepoints.push(indexes.length)
  }  
  release() {
    this.journal.savepoints.pop()
  }  
  rollback() {
    let { indexes, removals, inserts, savepoints } = this.journal
    let savepoint = savepoints.pop() || 0
    while (indexes.length > savepoint) {
      let index = indexes.pop()
      let removed = removals.pop()
      let inserted = inserts.pop()
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
        position: indexes.length,
      }
    }
  }
}
