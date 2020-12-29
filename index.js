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
      detachedNode = null
      return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
    } 
    let cmp = comp(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comp, replace)
    } else if (replace && right !== node) {
      curr[r] = detachNode(right, node)
    } else {
      detachedNode = null
    }
    if (result < RESIZED) return result
    if (result === UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) === 1) return UPDATED
    }
    if ((curr[d] & 3) === 2) return UNBALANCED
    return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comp, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      curr[d] += 4
      detachedNode = null
      return (--curr[d] & 3) === 0 ? RESIZED : UPDATED
    }    
    let cmp = comp(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comp, replace)
    } else if (replace && left !== node) {
      curr[l] = detachNode(left, node)
    } else {
      detachedNode = null
    }
    if (result === UNCHANGED) return UNCHANGED
    curr[d] += 4
    if (result === UPDATED) return UPDATED
    if (result === UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) === 1) return UPDATED
    }
    if ((curr[d] & 3) === 0) return UNBALANCED
    return (--curr[d] & 3) === 0 ? RESIZED : UPDATED
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
    if (left == null) {
      detachedNode = null
      return UNCHANGED
    }
    let cmp = comp(left, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(left, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comp)
    } else if (left[l] && left[r]) {
      let size = left[d] >>> 2
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    if (result === UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
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
    if ((curr[d] & 3) === 2) return UNBALANCED
    return (++curr[d] & 3) === 2 ? UPDATED : RESIZED
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
    if (result === UPDATED) return UPDATED
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
    if (result === UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comp) {
    let right = curr[r]
    if (right == null) {
      detachedNode = null
      return UNCHANGED  
    }
    let cmp = comp(right, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(right, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comp)
    } else if (right[l] && right[r]) {
      let size = right[d] >>> 2
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
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
    if ((curr[d] & 3) === 0) return UNBALANCED
    return (--curr[d] & 3) === 0 ? UPDATED : RESIZED
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
  function enumerate(node, start, end, reversed) {
    // assert(start < end)
    let count = end - start
    if (count === 1) {
      return new MiniGenerator(node, null)
    }
    if (count === 2) {
      let ascending = start === node[d] >>> 2
      let node2 = getAt(node, start + +ascending)
      if (ascending === reversed) {
        return new MiniGenerator(node2, node)
      } else {
        return new MiniGenerator(node, node2)
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
        return new WalkerGenerator(nodes, count, reversed)
      }
    }
  }
  function enumerateRange(root, start, end, reversed) {
    // assert(start < end)
    let curr = root[l]
    while (true) {
      let index = curr[d] >>> 2
      if (end <= index) {
        curr = curr[l]
      } else if (index < start) {
        curr = curr[r]
        start -= index + 1
        end -= index + 1
      } else {
        return enumerate(curr, start, end, reversed)
      }
    }
  }
  function enumerateWhere(root, comp, reversed) {
    let curr = root[l]
    while (curr) {
      let cmp = comp(curr)
      if (cmp < 0) curr = curr[r]
      else if (cmp > 0) curr = curr[l]
      else break
    }
    if (!curr) return new MiniGenerator(null, null)
    let start = curr[d] >>> 2
    let end = start + 1
    let offset = 0
    let node = curr[l]
    while (node) {
      if (comp(node) >= 0) {
        start = offset + (node[d] >>> 2)
        node = node[l]
      } else {
        offset += (node[d] >>> 2) + 1
        node = node[r]
      }
    }
    node = curr[r]
    while (node) {
      if (comp(node) > 0) {
        node = node[l]
      } else {
        end += (node[d] >>> 2) + 1
        node = node[r]
      }
    }    
    return enumerate(curr, start, end, reversed)
  }
  class WalkerGenerator extends IndexGenerator {
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
            // if (node[d] >>> 2 < this.count)
            nodes.push(current)
            current = current[l]
          }
        }
      }
      this.current = nodes.pop()
      return true
    }  
  }
  class MiniGenerator extends IndexGenerator {
    constructor(item, item2) {
      super()
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
      addLeft(root, value, comp, true)
      return getDetached()
    }
    delete(value) {
      let { root, comp } = this
      deleteLeft(root, value, comp)
      return getDetached()
    }
    deleteAt(index) {
      let { root, size } = this
      // if (index < 0) index = size + index
      if (index < 0 || index >= size) return null
      deleteLeftAt(root, index)
      return getDetached()
    }
    get(value) {
      let { root, comp } = this
      let isComp = typeof value === 'function'
      let node = root[l]
      while (node) {
        let cmp = isComp ? value(node) : comp(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else return node
      }
      return null
    }  
    getAt(index) {
      let { root, size } = this
      // if (index < 0) index = size + index
      if (index < 0 || index >= size) return null
      return getAt(root[l], index)
    }
    findRange(comp) {
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
          start = end + (node[d] >>> 2)
          let offset = end
          beforeStart = beforeEnd // !!
          afterStart = node
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
        start, beforeStart, afterStart, 
        end, beforeEnd, afterEnd 
      }
    } 
    enumerate(a, b, c) {
      let { root } = this
      if (typeof a === 'function') {
        return enumerateWhere(root, a, b)
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
      if (a < b) {
        return enumerateRange(root, a, b, c)
      }
      return new MiniGenerator(null, null)
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
class IndexGenerator {
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
    return new MapGenerator(this, transform)
  }
  filter(predicate) {
    return new FilterGenerator(this, predicate)
  }
  flatten() {
    return new FlattenGenerator(this)
  }
  skipTake(skip, take) {
    return new RangeGenerator(this, skip, take)
  }
  fallback(value) {
    return new FallbackGenerator(this, value)
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
}
export class Rator extends IndexGenerator {
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

class MapGenerator extends IndexGenerator {
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
class FilterGenerator extends IndexGenerator {
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
class FlattenGenerator extends IndexGenerator {
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
            this.inner = new Rator(current)
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
class RangeGenerator extends IndexGenerator {
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
class FallbackGenerator extends IndexGenerator {
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


export class Transaction {
  constructor() {
    this.journal = {
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
  replace(index, item, replacee) {
    let removed = this.insert(index, item)
    removed = removed || replacee && this.delete(replacee)
    return removed !== replacee
  }  
  rollback() {
    let { indexes, removals, inserts } = this.journal
    while (indexList.length) {
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
        position: indexList.length,
      }
    }
  }
}
